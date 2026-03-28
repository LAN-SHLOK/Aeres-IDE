const path = require('path')
const { spawnSync } = require('child_process')

let nodePty = null
try {
  // Directly attempt to load node-pty. 
  // Since we've rebuilt it with Visual Studio Build Tools, it should be compatible.
  nodePty = require('node-pty')
} catch (err) {
  console.warn('[TerminalHandler] node-pty unavailable or incompatible:', err.message)
}



const terminals = new Map()
let idCounter = 0

function getShell() {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

function register(ipcMain, app, getMainWindow) {
  ipcMain.handle('terminal:create', (_, opts = {}) => {
    if (!nodePty) {
      throw new Error('node-pty is not available. Run: npx electron-rebuild')
    }
    const id = ++idCounter
    const cwd = opts.cwd || (app ? app.getPath('home') : process.cwd())
    const shell = opts.shell || getShell()

    const ptyProcess = nodePty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: opts.cols || 80,
      rows: opts.rows || 24,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
    })

    ptyProcess.onData((data) => {
      const mainWindow = getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`terminal:data:${id}`, data)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      const mainWindow = getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`terminal:exit:${id}`, { exitCode })
      }
      terminals.delete(id)
    })

    terminals.set(id, { ptyProcess, rows: opts.rows || 24, cols: opts.cols || 80 })
    return { id }
  })

  ipcMain.handle('terminal:write', (_, { id, data }) => {
    const term = terminals.get(id)
    if (term) term.ptyProcess.write(data)
  })

  ipcMain.handle('terminal:resize', (_, { id, rows, cols }) => {
    const term = terminals.get(id)
    if (term) {
      try {
        term.ptyProcess.resize(cols, rows)
        term.rows = rows
        term.cols = cols
      } catch (e) {
        console.warn('[TerminalHandler] resize error:', e.message)
      }
    }
  })

  ipcMain.handle('terminal:kill', (_, { id }) => {
    const term = terminals.get(id)
    if (term) {
      try { term.ptyProcess.kill() } catch { /* already dead */ }
      terminals.delete(id)
    }
  })

  ipcMain.handle('terminal:setcwd', (_, { id, cwd }) => {
    const term = terminals.get(id)
    if (term) {
      const cmd = process.platform === 'win32' ? `cd /d "${cwd}"\r` : `cd "${cwd}"\r`
      term.ptyProcess.write(cmd)
    }
  })
}

function killAll() {
  for (const [id, term] of terminals) {
    try { term.ptyProcess.kill() } catch { /* ignore */ }
  }
  terminals.clear()
}

module.exports = { register, killAll }
