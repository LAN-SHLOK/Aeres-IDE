const { ipcMain } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const rpc = require('vscode-jsonrpc/node')

let servers = {} // lang -> { process, connection }

/**
 * Language Server configurations
 * Each entry maps a language ID to its server binary and arguments
 */
const LSP_CONFIGS = {
  python: {
    bins: ['pyright-langserver', 'pylsp', 'pyls'],
    args: ['--stdio'],
  },
  javascript: {
    bins: ['typescript-language-server'],
    args: ['--stdio'],
    extraArgs: (getBinary) => ['--tsserver-path', getBinary('tsserver') || 'tsserver'],
  },
  typescript: {
    bins: ['typescript-language-server'],
    args: ['--stdio'],
    extraArgs: (getBinary) => ['--tsserver-path', getBinary('tsserver') || 'tsserver'],
  },
  css: {
    bins: ['vscode-css-language-server', 'vscode-css-languageserver', 'css-languageserver'],
    args: ['--stdio'],
  },
  html: {
    bins: ['vscode-html-language-server', 'vscode-html-languageserver', 'html-languageserver'],
    args: ['--stdio'],
  },
  json: {
    bins: ['vscode-json-language-server', 'vscode-json-languageserver', 'json-languageserver'],
    args: ['--stdio'],
  },
  go: {
    bins: ['gopls'],
    args: ['serve'],
    system: true, // look in system PATH
  },
  rust: {
    bins: ['rust-analyzer'],
    args: [],
    system: true,
  },
  java: {
    bins: ['jdtls'],
    args: [],
    system: true,
  },
  cpp: {
    bins: ['clangd'],
    args: ['--background-index'],
    system: true,
  },
  c: {
    bins: ['clangd'],
    args: ['--background-index'],
    system: true,
  },
  yaml: {
    bins: ['yaml-language-server'],
    args: ['--stdio'],
  },
  dart: {
    bins: ['dart'],
    args: ['language-server', '--protocol=lsp'],
    system: true,
  },
  ruby: {
    bins: ['solargraph'],
    args: ['stdio'],
    system: true,
  },
  php: {
    bins: ['phpactor'],
    args: ['language-server'],
    system: true,
  },
  lua: {
    bins: ['lua-language-server'],
    args: [],
    system: true,
  },
  kotlin: {
    bins: ['kotlin-language-server'],
    args: [],
    system: true,
  },
  csharp: {
    bins: ['OmniSharp'],
    args: ['-lsp'],
    system: true,
  },
  swift: {
    bins: ['sourcekit-lsp'],
    args: [],
    system: true,
  },
  elixir: {
    bins: ['elixir-ls'],
    args: [],
    system: true,
  },
  haskell: {
    bins: ['haskell-language-server-wrapper'],
    args: ['--lsp'],
    system: true,
  },
  zig: {
    bins: ['zls'],
    args: [],
    system: true,
  },
}

function register(ipcMain, app, getMainWindow) {
  ipcMain.handle('lsp:start', async (_, { language, rootPath }) => {
    if (servers[language]) return true
    
    const getBinary = (name) => {
      const paths = [
        path.join(app.getAppPath(), 'node_modules', '.bin', name),
        path.join(app.getAppPath(), '..', '..', 'node_modules', '.bin', name)
      ]
      for (let p of paths) {
        if (process.platform === 'win32') p += '.cmd'
        if (fs.existsSync(p)) return p
      }
      return null
    }

    const config = LSP_CONFIGS[language]
    if (!config) {
      console.log(`[LSP] No configuration for language: ${language}`)
      return false
    }

    // Find the server binary
    let serverPath = null
    for (const bin of config.bins) {
      // Check node_modules first
      serverPath = getBinary(bin)
      if (serverPath) break
      
      // Check system PATH for system-level language servers
      if (config.system) {
        const systemBin = process.platform === 'win32' ? `${bin}.exe` : bin
        try {
          const { execSync } = require('child_process')
          const which = process.platform === 'win32' ? 'where' : 'which'
          const result = execSync(`${which} ${bin}`, { encoding: 'utf8', timeout: 3000 }).trim()
          if (result) {
            serverPath = result.split('\n')[0].trim()
            break
          }
        } catch {
          // Not found in PATH
        }
      }
    }

    if (!serverPath) {
      console.log(`[LSP] No server found for ${language}. Tried: ${config.bins.join(', ')}`)
      return false
    }

    // Build arguments
    let args = [...config.args]
    if (config.extraArgs) {
      args = [...args, ...config.extraArgs(getBinary)]
    }

    console.log(`[LSP] Starting ${language} server: ${serverPath} ${args.join(' ')}`)

    try {
      const child = spawn(serverPath, args, { 
        cwd: rootPath,
        shell: process.platform === 'win32'
      })
      const connection = rpc.createMessageConnection(
        new rpc.StreamMessageReader(child.stdout),
        new rpc.StreamMessageWriter(child.stdin)
      )

      connection.listen()
      
      // Initialize LSP
      await connection.sendRequest('initialize', {
        processId: process.pid,
        rootUri: `file://${rootPath.replace(/\\/g, '/')}`,
        capabilities: {
          textDocument: {
            publishDiagnostics: { relatedInformation: true },
            completion: {
              completionItem: { snippetSupport: true },
            },
            hover: { contentFormat: ['markdown', 'plaintext'] },
            signatureHelp: { signatureInformation: { documentationFormat: ['markdown'] } },
          },
          workspace: {
            workspaceFolders: true,
          },
        },
        workspaceFolders: [{ uri: `file://${rootPath.replace(/\\/g, '/')}`, name: path.basename(rootPath) }],
      })
      connection.sendNotification('initialized', {})

      connection.onNotification('textDocument/publishDiagnostics', (params) => {
        getMainWindow()?.webContents.send('lsp:diagnostics', params)
      })

      child.on('exit', (code) => {
        console.log(`[LSP] ${language} server exited with code ${code}`)
        delete servers[language]
      })

      child.stderr.on('data', (data) => {
        console.log(`[LSP ${language}] ${data.toString().slice(0, 200)}`)
      })

      servers[language] = { child, connection }
      console.log(`[LSP] ${language} server started successfully`)
      return true
    } catch (err) {
      console.error(`[LSP] Failed to start ${language} server:`, err.message)
      return false
    }
  })

  ipcMain.handle('lsp:stopAll', () => {
    Object.entries(servers).forEach(([lang, s]) => {
      console.log(`[LSP] Stopping ${lang} server`)
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

  // Get list of active language servers
  ipcMain.handle('lsp:status', () => {
    return Object.keys(servers).map(lang => ({
      language: lang,
      active: true,
      serverName: LSP_CONFIGS[lang]?.bins[0] || 'unknown'
    }))
  })
}

module.exports = { register }
