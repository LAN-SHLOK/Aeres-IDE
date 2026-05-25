const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let autoUpdater = null
try {
  autoUpdater = require('electron-updater').autoUpdater
} catch {
  /* optional in minimal env */
}

const { startSidecar, stopSidecar, getBackendPort } = require('./sidecar.cjs')
const authHandler = require('./ipcHandlers/authHandler.cjs')

let terminalKillAll = null
try {
  terminalKillAll = require('./ipcHandlers/terminalHandler.cjs').killAll
} catch { /* optional */ }

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('aeres', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('aeres')
}

let mainWindow = null
const allWindows = new Set()

function getMainWindow() {
  return mainWindow
}

function findDeepLinkArg(argv) {
  return argv.find((a) => typeof a === 'string' && a.startsWith('aeres://'))
}

async function createWindow(isNewWindow = false) {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  allWindows.add(win)

  // The first window becomes the main window
  if (!mainWindow) {
    mainWindow = win
  }

  let sidecarPort = null
  if (!isNewWindow) {
    try {
      sidecarPort = await startSidecar()
    } catch (err) {
      console.error('[Main] Sidecar failed to start:', err)
    }
  } else {
    sidecarPort = getBackendPort()
  }

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    await win.loadURL('http://127.0.0.1:5174')
  } else {
    await win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Execute startup logic immediately since we are showing window from the start
  if (sidecarPort) {
    win.webContents.send('sidecar:ready', { port: sidecarPort })
  } else {
    win.webContents.send('sidecar:error', { message: 'Python backend failed to start' })
  }
  const authStatus = {
    authenticated: !!global.__aeresJWT,
    email: global.__aeresEmail,
  }
  win.webContents.send('auth:startup', authStatus)
  if (!isNewWindow && app.isPackaged && autoUpdater) {
    try {
      autoUpdater.checkForUpdatesAndNotify()
    } catch (e) {
      console.warn('[Main] autoUpdater:', e.message)
    }
  }

  win.on('closed', () => {
    allWindows.delete(win)
    if (mainWindow === win) {
      // Promote the next available window as main, or null
      mainWindow = allWindows.size > 0 ? allWindows.values().next().value : null
    }
  })

  return win
}

app.whenReady().then(async () => {
  authHandler.register(ipcMain, app, getMainWindow)
  ipcMain.handle('sidecar:getPort', () => getBackendPort())

  const handlersToLoad = [
    'ragBridge',
    'staticAnalyzer',
    'terminalHandler',
    'lspHandler',
    'debugHandler',
    'gitHandler',
    'formatterHandler',
    'temporalHandler',
    'sessionHandler',
    'contractHandler',
    'radarHandler',
    'fsHandler',
  ]
  for (const h of handlersToLoad) {
    try {
      const handler = require(`./ipcHandlers/${h}.cjs`)
      if (handler.register) {
        handler.register(ipcMain, app, getMainWindow, getBackendPort)
      }
    } catch (err) {
      console.warn(`[Main] Handler ${h}:`, err.message)
    }
  }

  if (autoUpdater) {
    autoUpdater.on('update-available', () => mainWindow?.webContents.send('update:available'))
    autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('update:downloaded'))
  }
  ipcMain.on('update:install', () => {
    if (autoUpdater) autoUpdater.quitAndInstall()
  })

  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.on('window:close', () => {
    const focusedWin = BrowserWindow.getFocusedWindow()
    if (focusedWin) focusedWin.close()
    else mainWindow?.close()
  })

  ipcMain.handle('window:newWindow', async () => {
    try {
      await createWindow(true)
      return { success: true }
    } catch (err) {
      console.error('[Main] Failed to create new window:', err)
      return { success: false, error: err.message }
    }
  })

  await createWindow()

  const deepLink = findDeepLinkArg(process.argv)
  if (deepLink) {
    authHandler.handleDeepLink(deepLink, mainWindow, app)
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  authHandler.handleDeepLink(url, mainWindow, app)
})

app.on('second-instance', (event, commandLine) => {
  const url = findDeepLinkArg(commandLine)
  if (url) authHandler.handleDeepLink(url, mainWindow, app)
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  stopSidecar()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (allWindows.size === 0) {
    createWindow().catch((err) => console.error('[Main] activate createWindow:', err))
  }
})

app.on('before-quit', () => {
  if (terminalKillAll) terminalKillAll()
  stopSidecar()
})
