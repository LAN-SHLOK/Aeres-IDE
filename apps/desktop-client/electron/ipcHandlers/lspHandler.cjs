const { ipcMain } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const rpc = require('vscode-jsonrpc/node')

let servers = {} // lang -> { process, connection }

function register(ipcMain, app, getMainWindow) {
  ipcMain.handle('lsp:start', async (_, { language, rootPath }) => {
    if (servers[language]) return true
    
    let serverPath = null
    if (language === 'python') {
      const paths = [
        path.join(app.getAppPath(), 'node_modules', '.bin', 'pyright-langserver'),
        path.join(app.getAppPath(), '..', '..', 'node_modules', '.bin', 'pyright-langserver')
      ]
      for (let p of paths) {
        if (process.platform === 'win32') p += '.cmd'
        if (require('fs').existsSync(p)) {
          serverPath = p
          break
        }
      }
      if (!serverPath) return false
    } else return false

    try {
      const child = spawn(serverPath, ['--stdio'], { 
        cwd: rootPath,
        shell: process.platform === 'win32'
      })
      const connection = rpc.createMessageConnection(
        new rpc.StreamMessageReader(child.stdout),
        new rpc.StreamMessageWriter(child.stdin)
      )

      connection.listen()
      
      // Initialize
      await connection.sendRequest('initialize', {
        processId: process.pid,
        rootUri: `file://${rootPath.replace(/\\/g, '/')}`,
        capabilities: {
          textDocument: {
            publishDiagnostics: { relatedInformation: true }
          }
        }
      })
      connection.sendNotification('initialized', {})

      connection.onNotification('textDocument/publishDiagnostics', (params) => {
        getMainWindow()?.webContents.send('lsp:diagnostics', params)
      })

      servers[language] = { child, connection }
      return true
    } catch (err) {
      console.error('LSP start error:', err)
      return false
    }
  })

  ipcMain.handle('lsp:stopAll', () => {
    Object.values(servers).forEach(s => {
      s.connection.dispose()
      s.child.kill()
    })
    servers = {}
    return true
  })

  // Proxy notifications from Monaco
  ipcMain.handle('lsp:notify', (_, { language, method, params }) => {
    const s = servers[language]
    if (s) s.connection.sendNotification(method, params)
    return true
  })

  // Proxy requests from Monaco
  ipcMain.handle('lsp:request', async (_, { language, method, params }) => {
    const s = servers[language]
    if (!s) return null
    return await s.connection.sendRequest(method, params)
  })
}

module.exports = { register }
