const { ipcMain } = require('electron')
const { spawn } = require('child_process')
const net = require('net')
const path = require('path')

let debugSession = null

function register(ipcMain, app, getMainWindow) {
  ipcMain.handle('debug:launch', async (_, { filePath, sessionId, breakOnStart = true }) => {
    if (debugSession) return { error: 'Already debugging' }
    
    // Get breakpoints for this file from the store (via IPC if needed, or passed in)
    // For now, assume they are handled via a separate 'debug:setBreakpoints' call or passed here.
    
    const port = 5678 + Math.floor(Math.random() * 100)
    const ext = path.extname(filePath).toLowerCase()
    
    if (ext === '.html' || ext === '.htm') {
      const { shell } = require('electron')
      shell.openPath(filePath)
      return { msg: 'Opened in browser' }
    }

    const pythonPath = process.platform === 'win32' ? 'python' : 'python3'
    
    const child = spawn(pythonPath, [
      '-m', 'debugpy', 
      '--listen', port.toString(),
      breakOnStart ? '--wait-for-client' : '',
      filePath
    ], {
      cwd: path.dirname(filePath),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })

    debugSession = { child, port, status: 'running' }

    child.stdout.on('data', (d) => getMainWindow()?.webContents.send('debug:output', d.toString()))
    child.stderr.on('data', (d) => getMainWindow()?.webContents.send('debug:output', d.toString()))
    child.on('exit', () => {
      getMainWindow()?.webContents.send('debug:terminated')
      debugSession = null
    })

    return { session: { port } }
  })

  ipcMain.handle('debug:command', async (_, { command }) => {
    if (!debugSession) return false
    // In a real DAP implementation, we'd send a JSON-RPC request over a socket to 'port'.
    // For this professional stub, we simulate the command flow.
    console.log(`[Debugger] Executing command: ${command}`)
    
    // If we had a socket connection to debugpy:
    // socket.write(JSON.stringify({ command, ... }))
    
    return true
  })

  ipcMain.handle('debug:stop', () => {
    if (debugSession) {
      debugSession.child.kill()
      debugSession = null
    }
    return true
  })

  // DAP (Debug Adapter Protocol) would go here for real integration
  // For now, we'll proxy basic DAP commands if we have a real adapter
  // But a simple implementation will just handle start/stop/output first.
}

module.exports = { register }
