import { invoke } from '@tauri-apps/api/core'
import { readTextFile, writeTextFile, mkdir, rename, remove, exists, readDir } from '@tauri-apps/plugin-fs'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { type as osType, platform as osPlatform } from '@tauri-apps/plugin-os'
import { getCurrentWindow } from '@tauri-apps/api/window'

// Cache platform info synchronously at load time
let _isMac = false
let _platform = 'windows'
try {
  _isMac = osType() === 'macos'
  _platform = osPlatform()
} catch (e) {
  console.warn('[tauri-bridge] Could not detect OS type:', e)
}

/**
 * Proxy fetch to the Python backend sidecar via its dynamic port.
 */
async function fetchProxy(endpoint, method = 'GET', body = null, retries = 5) {
  try {
    const port = await invoke('get_backend_port')
    const url = `http://127.0.0.1:${port}${endpoint}`
    const opts = { method, headers: { 'Content-Type': 'application/json' } }
    
    let groqApiKey = ''
    try {
      const stateStr = localStorage.getItem('aeres-ide-state')
      if (stateStr) {
        const parsed = JSON.parse(stateStr)
        if (parsed?.state?.editorSettings?.groqApiKey) {
          groqApiKey = parsed.state.editorSettings.groqApiKey
        }
      }
    } catch (e) {}
    
    if (groqApiKey) {
      opts.headers['x-groq-api-key'] = groqApiKey
    }

    if (body) opts.body = JSON.stringify(body)
    
    let res;
    try {
      res = await fetch(url, opts)
    } catch (err) {
      // If it's a network error (e.g. Failed to fetch) and we have retries left, wait and retry.
      // This handles the PyInstaller onefile startup delay where the sidecar takes 5-15s to extract and run.
      if (retries > 0 && err.message && err.message.includes('Failed to fetch')) {
        console.warn(`[fetchProxy] Backend not ready yet, retrying in 3s... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return await fetchProxy(endpoint, method, body, retries - 1);
      }
      throw err;
    }
    
    let data
    try {
      data = await res.json()
    } catch(e) {
      const text = await res.text()
      if (!res.ok) throw new Error(text || res.statusText)
      return text
    }

    if (!res.ok) {
      throw new Error(data.detail || data.error || data.message || `HTTP ${res.status} ${res.statusText}`)
    }
    return data
  } catch (e) {
    console.error('[fetchProxy] Error:', e)
    throw e
  }
}

window.electron = {
  isMac: _isMac,
  platform: _platform === 'windows' ? 'win32' : _platform,

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    onDeepLink: (cb) => {
      import('@tauri-apps/plugin-deep-link').then(({ onOpenUrl }) => {
        onOpenUrl((urls) => {
          urls.forEach(url => cb(url))
        })
      }).catch(e => console.error('[auth.onDeepLink] Error:', e))

      // Also fallback manual event emitted by single-instance on Windows
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('deep-link-received', (event) => {
          if (event.payload) cb(event.payload)
        })
      }).catch(e => console.error('[auth.onDeepLink] Event error:', e))
    },
    getStatus: async () => {
      try {
        const token = localStorage.getItem('aeres-token')
        const email = localStorage.getItem('aeres-email')
        if (token && email) {
          return { authenticated: true, email }
        }
      } catch (e) {
        console.error('[auth.getStatus] Error:', e)
      }
      return { authenticated: false, email: null }
    },
    saveToken: async (token, email) => {
      localStorage.setItem('aeres-token', token)
      localStorage.setItem('aeres-email', email)
    },
    logout: async () => {
      localStorage.removeItem('aeres-token')
      localStorage.removeItem('aeres-email')
    },
    openBrowser: async (source) => {
      // Open the web-frontend auth page in the user's default browser
      try {
        const { open } = await import('@tauri-apps/plugin-shell')
        const webUrl = `http://localhost:5173/auth?source=${source || 'ide'}`
        await open(webUrl)
      } catch (e) {
        console.error('[auth.openBrowser] Failed:', e)
        // Fallback: open via window.open (won't work in Tauri webview but worth trying)
        window.open(`http://localhost:5173/auth?source=${source || 'ide'}`, '_blank')
      }
    },
    openExternal: async (url) => {
      try {
        const { open } = await import('@tauri-apps/plugin-shell')
        await open(url)
      } catch (e) {
        window.open(url, '_blank')
      }
    }
  },

  // ── Sidecar (Python backend) ──────────────────────────────────────────────
  sidecar: {
    getPort: async () => {
      try {
        return await invoke('get_backend_port')
      } catch (e) {
        return null
      }
    }
  },

  // ── Window Management ─────────────────────────────────────────────────────
  window: {
    minimize: async () => {
      try {
        await getCurrentWindow().minimize()
      } catch (e) {
        console.error('[window.minimize] Error:', e)
      }
    },
    maximize: async () => {
      try {
        const win = getCurrentWindow()
        if (await win.isMaximized()) {
          await win.unmaximize()
        } else {
          await win.maximize()
        }
      } catch (e) {
        console.error('[window.maximize] Error:', e)
      }
    },
    close: async () => {
      try {
        await getCurrentWindow().close()
      } catch (e) {
        console.error('[window.close] Error:', e)
      }
    },
    toggleFullScreen: async () => {
      try {
        const win = getCurrentWindow()
        const isFullscreen = await win.isFullscreen()
        await win.setFullscreen(!isFullscreen)
      } catch (e) {}
    },
    toggleDevTools: () => {
      // Tauri doesn't have a runtime devtools toggle — use browser F12
    },
    newWindow: async () => {
      try {
        await invoke('new_window')
      } catch (e) {
        console.error('[window.newWindow] Error:', e)
      }
    }
  },

  // ── File System ───────────────────────────────────────────────────────────
  fs: {
    readFile: async (path) => {
      try {
        return await invoke('read_file', { path })
      } catch (e) {
        console.error('[fs.readFile] Error:', e)
        throw e
      }
    },
    writeFile: async (path, data) => {
      try {
        await invoke('write_file', { path, data })
        return true
      } catch (e) {
        console.error('[fs.writeFile] Error:', e)
        throw e
      }
    },
    createFolder: async (path) => {
      try {
        await invoke('create_folder', { path })
        return true
      } catch (e) {
        console.error('[fs.createFolder] Error:', e)
        throw e
      }
    },
    rename: async (oldPath, newPath) => {
      try {
        await invoke('rename_path', { oldPath, newPath })
        return true
      } catch (e) {
        console.error('[fs.rename] Error:', e)
        return false
      }
    },
    delete: async (path) => {
      try {
        await invoke('delete_path', { path })
        return true
      } catch (e) {
        console.error('[fs.delete] Error:', e)
        return false
      }
    },
    exists: async (path) => {
      try {
        return await invoke('path_exists', { path })
      } catch (e) {
        return false
      }
    },
    getTree: async (path) => {
      try {
        return await invoke('get_tree', { path })
      } catch (e) {
        console.error('[fs.getTree] Error:', e)
        return []
      }
    },
    openFolder: async () => {
      try {
        return await dialogOpen({ directory: true })
      } catch (e) {
        console.error('[fs.openFolder] Error:', e)
        return null
      }
    },
    openExternal: async (url) => {
      try {
        const { open } = await import('@tauri-apps/plugin-shell')
        await open(url)
      } catch (e) {
        console.error('[fs.openExternal] Error:', e)
      }
    },
    reveal: async (filePath) => {
      try {
        const { open } = await import('@tauri-apps/plugin-shell')
        // Open the parent directory of the file
        const sep = filePath.includes('\\') ? '\\' : '/'
        const parentDir = filePath.substring(0, filePath.lastIndexOf(sep))
        if (parentDir) {
          await open(parentDir)
        }
      } catch (e) {
        console.error('[fs.reveal] Error:', e)
      }
    },
    searchInProject: async (opts) => {
      try {
        const results = await invoke('search_in_project', { 
          path: opts.rootPath, 
          query: opts.query,
          matchCase: !!opts.matchCase,
          useRegex: !!opts.useRegex
        })
        return { results }
      } catch (e) {
        console.error('[fs.searchInProject] Error:', e)
        return { results: [] }
      }
    },
    onChanged: (cb) => {
      let unlistenPromise = import('@tauri-apps/api/event').then(({ listen }) => {
        return listen('tauri://file-changed', () => cb())
      })
      return () => {
        unlistenPromise.then(u => u && u())
      }
    },
    watchProject: async (path) => {
      try {
        await invoke('watch_project', { path })
      } catch (e) {
        console.error('[fs.watchProject] Error:', e)
      }
    }
  },

  // ── Terminal (PTY) ────────────────────────────────────────────────────────
  terminal: {
    create: async (opts) => {
      try {
        return await invoke('create_terminal', { cwd: opts?.cwd || null })
      } catch (e) {
        console.error('[terminal.create] Error:', e)
        throw e
      }
    },
    write: async (id, data) => {
      try {
        await invoke('write_terminal', { id, data })
      } catch (e) {
        console.error('[terminal.write] Error:', e)
      }
    },
    resize: async (id, rows, cols) => {
      try {
        await invoke('resize_terminal', { id, rows: rows || 24, cols: cols || 80 })
      } catch (e) {
        console.error('[terminal.resize] Error:', e)
      }
    },
    kill: async (id) => {
      try {
        await invoke('kill_terminal', { id })
      } catch (e) {
        console.error('[terminal.kill] Error:', e)
      }
    },
    onData: (id, cb) => {
      if (!cb || !id) return () => {}
      let unlistenPromise = import('@tauri-apps/api/event').then(({ listen }) => {
        return listen(`terminal:data:${id}`, (event) => cb(event.payload))
      })
      return () => {
        unlistenPromise.then(u => u && u())
      }
    },
    onExit: (id, cb) => {
      if (!id) return () => {}
      let unlistenPromise = import('@tauri-apps/api/event').then(({ listen }) => {
        return listen(`terminal:exit:${id}`, (event) => cb({ exitCode: event.payload?.code || 0 }))
      })
      return () => {
        unlistenPromise.then(u => u && u())
      }
    },
    getAvailableShells: async () => {
      if (_platform === 'windows') {
        return [
          { name: 'powershell', path: 'powershell.exe' },
          { name: 'cmd', path: 'cmd.exe' }
        ]
      }
      return [
        { name: 'bash', path: '/bin/bash' },
        { name: 'zsh', path: '/bin/zsh' }
      ]
    }
  },

  analyze: {
    contractGenerate: async (opts) => await fetchProxy('/api/contracts/generate', 'POST', opts),
    contractSummary: async (path) => await fetchProxy(`/api/contracts/summary?file_path=${encodeURIComponent(path)}`, 'GET'),
    mutationResults: async (path) => await fetchProxy(`/api/mutations/results?file_path=${encodeURIComponent(path)}`, 'GET'),
    runMutation: async (opts) => await fetchProxy('/api/mutations/run', 'POST', opts),
    scanDeps: async (path) => await fetchProxy('/api/deps/scan', 'POST', { root_path: path }),
    healthScan: async (opts) => await fetchProxy('/api/analyze/health', 'POST', opts),
    callGraph: async (filePath, rootPath) => await fetchProxy(`/api/analyze/call_graph?file_path=${encodeURIComponent(filePath)}&root_path=${encodeURIComponent(rootPath)}`, 'GET'),
    autocomplete: async (opts) => await fetchProxy('/api/rag/autocomplete', 'POST', opts),
    modernize: async (code, path) => {
      try {
        const port = await invoke('get_backend_port')
        const url = `http://127.0.0.1:${port}/api/analyze/modernize`
        
        let groqApiKey = ''
        try {
          const stateStr = localStorage.getItem('aeres-ide-state')
          if (stateStr) {
            const parsed = JSON.parse(stateStr)
            if (parsed?.state?.editorSettings?.groqApiKey) groqApiKey = parsed.state.editorSettings.groqApiKey
          }
        } catch (e) {}
        
        const headers = { 'Content-Type': 'application/json' }
        if (groqApiKey) headers['x-groq-api-key'] = groqApiKey

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: code, path: path })
        })
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          for (let line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                if (window.__aeresAnalyzeStreamCb) window.__aeresAnalyzeStreamCb(data)
              } catch (e) {}
            }
          }
        }
      } catch (e) {
        console.error('Modernize stream error:', e)
      }
    },
    onStream: (cb) => {
      window.__aeresAnalyzeStreamCb = cb
      return () => { window.__aeresAnalyzeStreamCb = null }
    }
  },

  // ── Radar ─────────────────────────────────────────────────────────────────
  radar: {
    scan: async (opts) => await fetchProxy('/api/deps/scan', 'POST', opts),
    getNotes: async (opts) => await fetchProxy('/api/deps/notes', 'POST', opts)
  },

  // ── Sessions (Tauri local storage) ────────────────────────────────────────
  sessions: {
    list: async () => {
      try {
        const { readDir: rd, readTextFile: rf, BaseDirectory } = await import('@tauri-apps/plugin-fs')
        const entries = await rd('.aeres/sessions', { baseDir: BaseDirectory.AppLocalData })
        const jsonFiles = entries.filter(e => e.name?.endsWith('.json'))
        const sessions = []
        for (const e of jsonFiles) {
          const id = e.name.replace('.json', '')
          try {
            const dataStr = await rf(`.aeres/sessions/${e.name}`, { baseDir: BaseDirectory.AppLocalData })
            const data = JSON.parse(dataStr)
            sessions.push({
              id,
              name: id,
              rootPath: data.rootPath,
              savedAt: data.savedAt || 0
            })
          } catch(err) {
            sessions.push({ id, name: id, savedAt: 0 })
          }
        }
        return sessions.sort((a, b) => b.savedAt - a.savedAt)
      } catch (e) { return [] }
    },
    save: async (name, state) => {
      try {
        const { writeTextFile: wf, mkdir: mk, BaseDirectory } = await import('@tauri-apps/plugin-fs')
        await mk('.aeres/sessions', { baseDir: BaseDirectory.AppLocalData, recursive: true })
        await wf(`.aeres/sessions/${name}.json`, JSON.stringify(state), { baseDir: BaseDirectory.AppLocalData })
      } catch (e) {
        console.error('[sessions.save] Error:', e)
      }
    },
    load: async (id) => {
      try {
        const { readTextFile: rf, BaseDirectory } = await import('@tauri-apps/plugin-fs')
        const data = await rf(`.aeres/sessions/${id}.json`, { baseDir: BaseDirectory.AppLocalData })
        return JSON.parse(data)
      } catch (e) { return {} }
    },
    delete: async (id) => {
      try {
        const { remove: rm, BaseDirectory } = await import('@tauri-apps/plugin-fs')
        await rm(`.aeres/sessions/${id}.json`, { baseDir: BaseDirectory.AppLocalData })
      } catch (e) {}
    }
  },

  // ── Environment ───────────────────────────────────────────────────────────
  env: {
    scan: async (rootPath) => await fetchProxy('/api/env/scan', 'POST', { root_path: rootPath })
  },

  // ── Git (Python backend proxy) ────────────────────────────────────────────
  git: {
    causalChain: async (opts) => await fetchProxy('/api/git/causal-chain', 'POST', opts),
    diff: async (rootPath, file) => await fetchProxy(`/api/git/diff?path=${encodeURIComponent(rootPath)}&file=${encodeURIComponent(file || '')}`, 'GET').then(res => res.diff || ''),
    generateCommit: async (diff) => await fetchProxy('/api/git/generate-commit', 'POST', { diff }).then(res => res.message || ''),
    branches: async (rootPath) => await fetchProxy(`/api/git/branches?path=${encodeURIComponent(rootPath)}`, 'GET').then(res => res.branches || []),
    log: async (rootPath, n) => await fetchProxy(`/api/git/log?path=${encodeURIComponent(rootPath)}&n=${n || 30}`, 'GET').then(res => res.log || []),
    init: async (rootPath) => await fetchProxy('/api/git/init', 'POST', { path: rootPath }),
    status: async (rootPath) => await fetchProxy(`/api/git/status?path=${encodeURIComponent(rootPath)}`, 'GET'),
    createBranch: async (rootPath, name, checkout) => await fetchProxy('/api/git/create_branch', 'POST', { path: rootPath, name, checkout }),
    switchBranch: async (rootPath, name) => await fetchProxy('/api/git/switch_branch', 'POST', { path: rootPath, name }),
    push: async (rootPath, force, auth) => await fetchProxy('/api/git/push', 'POST', { path: rootPath, force: !!force, ...(auth || {}) }),
    pull: async (rootPath, auth) => await fetchProxy('/api/git/pull', 'POST', { path: rootPath, ...(auth || {}) }),
    fetch: async (rootPath, auth) => await fetchProxy('/api/git/fetch', 'POST', { path: rootPath, ...(auth || {}) }),
    stage: async (rootPath, files) => await fetchProxy('/api/git/stage', 'POST', { path: rootPath, files }),
    unstage: async (rootPath, files) => await fetchProxy('/api/git/unstage', 'POST', { path: rootPath, files }),
    commit: async (rootPath, message) => await fetchProxy('/api/git/commit', 'POST', { path: rootPath, message }),
    stash: async (rootPath) => await fetchProxy('/api/git/stash', 'POST', { path: rootPath }),
    stashPop: async (rootPath) => await fetchProxy('/api/git/stash_pop', 'POST', { path: rootPath }),
    discardFile: async (rootPath, file) => await fetchProxy('/api/git/discard', 'POST', { path: rootPath, file }),
    setConfig: async (rootPath, name, email) => await fetchProxy('/api/git/config', 'POST', { path: rootPath, name, email }),
    addRemote: async (rootPath, url) => await fetchProxy('/api/git/add_remote', 'POST', { path: rootPath, url })
  },

  // ── Contract Observer ─────────────────────────────────────────────────────
  contract: {
    getSummary: async (path) => await fetchProxy(`/api/contracts/summary?file_path=${encodeURIComponent(path)}`, 'GET'),
    onSuggestion: (cb) => () => {},
    generate: async (opts) => await fetchProxy('/api/contracts/generate', 'POST', opts)
  },

  // ── RAG / AI Agent ────────────────────────────────────────────────────────
  rag: {
    query: async (question, context) => await fetchProxy('/api/rag/query', 'POST', { question, context }),
    onAgentStep: (cb) => {
      window.__aeresRagStreamCb = cb
      return () => { window.__aeresRagStreamCb = null }
    },
    agentStream: async (opts) => {
      try {
        const port = await invoke('get_backend_port')
        const url = `http://127.0.0.1:${port}/api/rag/agent_stream`
        
        let groqApiKey = ''
        try {
          const stateStr = localStorage.getItem('aeres-ide-state')
          if (stateStr) {
            const parsed = JSON.parse(stateStr)
            if (parsed?.state?.editorSettings?.groqApiKey) groqApiKey = parsed.state.editorSettings.groqApiKey
          }
        } catch (e) {}
        
        const headers = { 'Content-Type': 'application/json' }
        if (groqApiKey) headers['x-groq-api-key'] = groqApiKey

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(opts)
        })
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          for (let line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                if (window.__aeresRagStreamCb) window.__aeresRagStreamCb(data)
              } catch (e) {}
            }
          }
        }
      } catch (e) {
        console.error('Agent stream error:', e)
      }
    }
  },

  // ── Debug ─────────────────────────────────────────────────────────────────
  debug: {
    onOutput: (cb) => {
      let unlistenPromise = import('@tauri-apps/api/event').then(({ listen }) => {
        return listen('debug:output', (event) => cb(event.payload))
      })
      return () => {
        unlistenPromise.then(u => u && u())
      }
    },
    onTerminated: (cb) => {
      let unlistenPromise = import('@tauri-apps/api/event').then(({ listen }) => {
        return listen('debug:terminated', (event) => cb(event.payload))
      })
      return () => {
        unlistenPromise.then(u => u && u())
      }
    },
    launch: async (opts) => {
      const filePath = typeof opts === 'string' ? opts : opts.filePath
      const cwd = typeof opts === 'object' ? opts.cwd : undefined
      return await invoke('debug_launch', { filePath, cwd })
    },
    stop: async (session) => await invoke('debug_stop', { sessionId: session?.session || session }),
    evaluate: async (session, code) => await invoke('debug_evaluate', { sessionId: session?.session || session, code })
  },

  // ── Temporal ──────────────────────────────────────────────────────────────
  temporal: {
    getFile: async (path) => await fetchProxy(`/api/perf/temporal_file?file_path=${encodeURIComponent(path)}`, 'GET'),
    wrapPython: async () => "",
    onUpdate: (filePath, cb) => {
      // Poll the temporal endpoint for live updates
      let active = true
      let lastData = null
      
      const poll = async () => {
        if (!active) return
        try {
          const res = await window.electron.temporal.getFile(filePath)
          const jsonStr = JSON.stringify(res)
          if (jsonStr !== lastData) {
            lastData = jsonStr
            cb(res)
          }
        } catch (e) {}
        if (active) setTimeout(poll, 2000)
      }
      
      poll()
      
      return () => { active = false }
    }
  },

  // ── LSP ───────────────────────────────────────────────────────────────────
  lsp: {
    start: async () => {},
    notify: async () => {},
    request: async () => ({}),
    onDiagnostics: (cb) => {
      // In Tauri we can manually check diagnostics via the Python backend
      window.__aeresLspDiagCb = cb
      return () => { window.__aeresLspDiagCb = null }
    },
    checkDiagnostics: async (filePath) => {
      try {
        const res = await invoke('check_diagnostics', { filePath })
        if (res && res.diagnostics && window.__aeresLspDiagCb) {
          // Send in the format App.jsx expects: { uri, diagnostics }
          window.__aeresLspDiagCb({ uri: filePath, diagnostics: res.diagnostics })
        }
        return res
      } catch (e) {
        console.error('[lsp.checkDiagnostics] Error:', e)
        return { diagnostics: [] }
      }
    }
  }
}

// Global handler for the IDE to trigger diagnostic checks when files are saved or opened
window.electron.lsp = window.electron.lsp || {}
