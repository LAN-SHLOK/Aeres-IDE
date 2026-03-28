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

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('aether', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('aether')
}

let mainWindow = null

function getMainWindow() {
  return mainWindow
}

function findDeepLinkArg(argv) {
  return argv.find((a) => typeof a === 'string' && a.startsWith('aether://'))
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  let sidecarPort = null
  try {
    sidecarPort = await startSidecar()
  } catch (err) {
    console.error('[Main] Sidecar failed to start:', err)
  }

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    await mainWindow.loadURL('http://127.0.0.1:5174')
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Execute startup logic immediately since we are showing window from the start
  if (sidecarPort) {
    mainWindow.webContents.send('sidecar:ready', { port: sidecarPort })
  } else {
    mainWindow.webContents.send('sidecar:error', { message: 'Python backend failed to start' })
  }
  const authStatus = {
    authenticated: !!global.__aetherJWT,
    email: global.__aetherEmail,
  }
  mainWindow.webContents.send('auth:startup', authStatus)
  if (app.isPackaged && autoUpdater) {
    try {
      autoUpdater.checkForUpdatesAndNotify()
    } catch (e) {
      console.warn('[Main] autoUpdater:', e.message)
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  authHandler.register(ipcMain)
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

  await createWindow()

  const deepLink = findDeepLinkArg(process.argv)
  if (deepLink) {
    authHandler.handleDeepLink(deepLink, mainWindow)
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  authHandler.handleDeepLink(url, mainWindow)
})

app.on('second-instance', (event, commandLine) => {
  const url = findDeepLinkArg(commandLine)
  if (url) authHandler.handleDeepLink(url, mainWindow)
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
  if (mainWindow === null) {
    createWindow().catch((err) => console.error('[Main] activate createWindow:', err))
  }
})

app.on('before-quit', () => {
  if (terminalKillAll) terminalKillAll()
  stopSidecar()
})
