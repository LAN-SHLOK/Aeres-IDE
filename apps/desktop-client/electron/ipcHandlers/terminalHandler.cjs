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



const fs = require('fs')
const terminals = new Map()
let idCounter = 0

function getAvailableShells() {
  const shells = []
  if (process.platform === 'win32') {
    shells.push({ name: 'powershell', path: 'powershell.exe' })
    shells.push({ name: 'cmd', path: 'cmd.exe' })
    const gitBashPaths = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\git-bash.exe',
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Git', 'git-bash.exe'),
      path.join(process.env.PROGRAMFILES_X86 || 'C:\\Program Files (x86)', 'Git', 'bin', 'bash.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'bash.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'git-bash.exe'),
      path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Git', 'bin', 'bash.exe')
    ]
    // Check if git.exe is in the system PATH and resolve bash relative to it
    try {
      const whereGit = spawnSync('where.exe', ['git.exe'], { encoding: 'utf8' })
      if (whereGit.status === 0 && whereGit.stdout) {
        const gitPath = whereGit.stdout.split('\r\n')[0].trim()
        if (gitPath) {
          const resolvedBash = gitPath.replace(/\\cmd\\git\.exe$/i, '\\bin\\bash.exe')
                                       .replace(/\\bin\\git\.exe$/i, '\\bin\\bash.exe')
          if (fs.existsSync(resolvedBash)) {
            gitBashPaths.push(resolvedBash)
          }
        }
      }
    } catch (e) {
      // ignore
    }
    for (const p of gitBashPaths) {
      if (fs.existsSync(p)) {
        shells.push({ name: 'git bash', path: p })
        break
      }
    }
    const wslPath = 'C:\\Windows\\System32\\wsl.exe'
    if (fs.existsSync(wslPath)) {
      shells.push({ name: 'wsl', path: wslPath })
    }
  } else {
    const common = [
      { name: 'zsh', path: '/bin/zsh' },
      { name: 'bash', path: '/bin/bash' },
      { name: 'sh', path: '/bin/sh' }
    ]
    for (const item of common) {
      if (fs.existsSync(item.path)) {
        shells.push(item)
      }
    }
  }
  return shells
}

function getShell() {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

function register(ipcMain, app, getMainWindow) {
  ipcMain.handle('terminal:get-available-shells', () => {
    return getAvailableShells()
  })

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

    let lineBuffer = ''
    ptyProcess.onData((data) => {
      const mainWindow = getMainWindow()
      if (!mainWindow || mainWindow.isDestroyed()) return

      // Accumulate for timing extraction
      lineBuffer += data
      
      // Process complete lines if they exist
      let aeresTimingLine = null
      if (lineBuffer.includes('AERES_TIMING:')) {
        const parts = lineBuffer.split('AERES_TIMING:')
        const before = parts[0]
        const after = parts[1]
        const newlineIdx = after.indexOf('\n')
        if (newlineIdx !== -1) {
          aeresTimingLine = after.substring(0, newlineIdx).trim()
          lineBuffer = before + after.substring(newlineIdx + 1)
        }
      }

      // If we found the timing line, process and ingest it!
      if (aeresTimingLine) {
        try {
          const timings = JSON.parse(aeresTimingLine)
          if (Array.isArray(timings) && timings.length > 0) {
            const filePath = timings[0].file
            if (filePath) {
              const temporalHandler = require('./temporalHandler.cjs')
              const existing = temporalHandler.timingStore.get(filePath) || []
              const merged = temporalHandler.mergeTimings(existing, timings)
              temporalHandler.timingStore.set(filePath, merged)
              mainWindow.webContents.send('temporal:update', { filePath, timings: merged })
            }
          }
        } catch (e) {
          console.error('[Terminal profiling parse error]', e)
        }
      }

      // Also forward standard data to frontend, but strip out the AERES_TIMING line if it's currently in the data
      let forwardData = data
      if (forwardData.includes('AERES_TIMING:')) {
        const lines = forwardData.split(/\r?\n/)
        const cleanLines = lines.filter(l => !l.includes('AERES_TIMING:'))
        forwardData = cleanLines.join('\r\n')
      }
      
      mainWindow.webContents.send(`terminal:data:${id}`, forwardData)
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
