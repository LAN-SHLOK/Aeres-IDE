const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  auth: {
    getStatus: () => ipcRenderer.invoke('auth:getStatus'),
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    openBrowser: (source) => ipcRenderer.invoke('auth:openBrowser', source),
    onSuccess: (cb) => {
      const h = (_, d) => cb(d)
      ipcRenderer.on('auth:success', h)
      return () => ipcRenderer.off('auth:success', h)
    },
    onStartup: (cb) => {
      const h = (_, d) => cb(d)
      ipcRenderer.on('auth:startup', h)
      return () => ipcRenderer.off('auth:startup', h)
    },
    onRefreshNeeded: (cb) => {
      const h = () => cb()
      ipcRenderer.on('auth:refresh_needed', h)
      return () => ipcRenderer.off('auth:refresh_needed', h)
    },
  },

  sidecar: {
    getPort: () => ipcRenderer.invoke('sidecar:getPort'),
    onReady: (cb) => {
      const h = (_, d) => cb(d)
      ipcRenderer.on('sidecar:ready', h)
      return () => ipcRenderer.off('sidecar:ready', h)
    },
    onError: (cb) => {
      const h = (_, d) => cb(d)
      ipcRenderer.on('sidecar:error', h)
      return () => ipcRenderer.off('sidecar:error', h)
    },
  },

  fs: {
    openFolder: () => ipcRenderer.invoke('fs:openFolder'),
    readFile: (p) => ipcRenderer.invoke('fs:readFile', p),
    writeFile: (p, content) => ipcRenderer.invoke('fs:writeFile', p, content),
    exists: (p) => ipcRenderer.invoke('fs:exists', p),
    getTree: (rootPath) => ipcRenderer.invoke('fs:getTree', rootPath),
    searchInProject: (opts) => ipcRenderer.invoke('search:inProject', opts),
  },

  analyze: {
    modernize: (content, p) => ipcRenderer.invoke('analyze:modernize', content, p),
    scanProject: (filePaths) => ipcRenderer.invoke('analyze:scanProject', filePaths),
    onStream: (cb) => ipcRenderer.on('analyze:stream', (_, chunk) => cb(chunk)),
    offStream: () => ipcRenderer.removeAllListeners('analyze:stream'),
  },

  rag: {
    query: (question, context) => ipcRenderer.invoke('rag:query', question, context),
  },

  terminal: {
    create: (opts) => ipcRenderer.invoke('terminal:create', opts),
    write: (id, data) => ipcRenderer.invoke('terminal:write', { id, data }),
    resize: (id, r, c) => ipcRenderer.invoke('terminal:resize', { id, rows: r, cols: c }),
    kill: (id) => ipcRenderer.invoke('terminal:kill', { id }),
    setcwd: (id, cwd) => ipcRenderer.invoke('terminal:setcwd', { id, cwd }),
    onData: (id, cb) => ipcRenderer.on(`terminal:data:${id}`, (_, d) => cb(d)),
    onExit: (id, cb) => ipcRenderer.on(`terminal:exit:${id}`, (_, d) => cb(d)),
    offAll: (id) => {
      ipcRenderer.removeAllListeners(`terminal:data:${id}`)
      ipcRenderer.removeAllListeners(`terminal:exit:${id}`)
    },
  },

  lsp: {
    start: (language, rootPath) => ipcRenderer.invoke('lsp:start', { language, rootPath }),
    stopAll: () => ipcRenderer.invoke('lsp:stopAll'),
    request: (language, method, params) => ipcRenderer.invoke('lsp:request', { language, method, params }),
    notify: (language, method, params) => ipcRenderer.invoke('lsp:notify', { language, method, params }),
    onDiagnostics: (cb) => {
      const h = (_, d) => cb(d)
      ipcRenderer.on('lsp:diagnostics', h)
      return () => ipcRenderer.off('lsp:diagnostics', h)
    },
  },

  debug: {
    start: (opts) => ipcRenderer.invoke('debug:start', opts),
    stop: (sessionId) => ipcRenderer.invoke('debug:stop', { sessionId }),
    setBreakpoints: (sid, fp, bps) =>
      ipcRenderer.invoke('debug:setBreakpoints', { sessionId: sid, filePath: fp, breakpoints: bps }),
    continue: () => ipcRenderer.invoke('debug:command', { command: 'continue' }),
    stepOver: () => ipcRenderer.invoke('debug:command', { command: 'next' }),
    stepInto: () => ipcRenderer.invoke('debug:command', { command: 'stepIn' }),
    stepOut: () => ipcRenderer.invoke('debug:command', { command: 'stepOut' }),
    stackTrace: (sid, tid) => ipcRenderer.invoke('debug:stackTrace', { sessionId: sid, threadId: tid }),
    variables: (sid, varRef) =>
      ipcRenderer.invoke('debug:variables', { sessionId: sid, variablesReference: varRef }),
    evaluate: (sid, expr, fid) =>
      ipcRenderer.invoke('debug:evaluate', { sessionId: sid, expression: expr, frameId: fid }),
    onStopped: (cb) => {
      const h = (_, d) => cb(d)
      ipcRenderer.on('debug:stopped', h)
      return () => ipcRenderer.off('debug:stopped', h)
    },
    onContinued: (cb) => {
      const h = (_, d) => cb(d)
      ipcRenderer.on('debug:continued', h)
      return () => ipcRenderer.off('debug:continued', h)
    },
    onOutput: (cb) => {
      const h = (_, d) => cb(d)
      ipcRenderer.on('debug:output', h)
      return () => ipcRenderer.off('debug:output', h)
    },
    onTerminated: (cb) => {
      const h = (_, d) => cb(d)
      ipcRenderer.on('debug:terminated', h)
      return () => ipcRenderer.off('debug:terminated', h)
    },
  },

  git: {
    status: (root) => ipcRenderer.invoke('git:status', { rootPath: root }),
    diff: (root, fp, staged) => ipcRenderer.invoke('git:diff', { rootPath: root, filePath: fp, staged }),
    stage: (root, fps) => ipcRenderer.invoke('git:stage', { rootPath: root, filePaths: fps }),
    unstage: (root, fps) => ipcRenderer.invoke('git:unstage', { rootPath: root, filePaths: fps }),
    discard: (root, fp) => ipcRenderer.invoke('git:discardChanges', { rootPath: root, filePath: fp }),
    commit: (root, msg, amend) => ipcRenderer.invoke('git:commit', { rootPath: root, message: msg, amend }),
    push: (root, force) => ipcRenderer.invoke('git:push', { rootPath: root, force }),
    pull: (root) => ipcRenderer.invoke('git:pull', { rootPath: root }),
    fetch: (root) => ipcRenderer.invoke('git:fetch', { rootPath: root }),
    branches: (root) => ipcRenderer.invoke('git:branches', { rootPath: root }),
    createBranch: (root, name, co) => ipcRenderer.invoke('git:createBranch', { rootPath: root, name, checkout: co }),
    switchBranch: (root, name) => ipcRenderer.invoke('git:switchBranch', { rootPath: root, name }),
    deleteBranch: (root, name, f) => ipcRenderer.invoke('git:deleteBranch', { rootPath: root, name, force: f }),
    log: (root, limit, fp) => ipcRenderer.invoke('git:log', { rootPath: root, limit, filePath: fp }),
    blame: (root, fp) => ipcRenderer.invoke('git:blame', { rootPath: root, filePath: fp }),
    stash: (root, msg) => ipcRenderer.invoke('git:stash', { rootPath: root, message: msg }),
    stashPop: (root) => ipcRenderer.invoke('git:stashPop', { rootPath: root }),
  },

  format: {
    document: (content, filePath, lang) =>
      ipcRenderer.invoke('format:document', { content, filePath, language: lang }),
    lint: (filePath, rootPath) => ipcRenderer.invoke('lint:file', { filePath, rootPath }),
  },

  temporal: {
    getFile: (filePath) => ipcRenderer.invoke('temporal:getFile', { filePath }),
    ingest: (filePath, timings) => ipcRenderer.invoke('temporal:ingest', { filePath, timings }),
    onUpdate: (filePath, cb) => {
      const handler = (_, d) => { if(d.filePath === filePath) cb(d.timings) }
      ipcRenderer.on(`temporal:update`, handler)
      return () => ipcRenderer.off('temporal:update', handler)
    },
    clear: (filePath) => ipcRenderer.invoke('temporal:clearFile', { filePath }),
    wrapPython: (scriptPath) => ipcRenderer.invoke('temporal:wrapPython', { scriptPath }),
  },

  sessions: {
    save: (name, state) => ipcRenderer.invoke('sessions:save', { name, state }),
    list: () => ipcRenderer.invoke('sessions:list'),
    load: (id) => ipcRenderer.invoke('sessions:load', { id }),
    delete: (id) => ipcRenderer.invoke('sessions:delete', { id }),
    rename: (id, name) => ipcRenderer.invoke('sessions:rename', { id, newName: name }),
  },

  updater: {
    onAvailable: (cb) => ipcRenderer.on('update:available', cb),
    onDownloaded: (cb) => ipcRenderer.on('update:downloaded', cb),
    install: () => ipcRenderer.send('update:install'),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('update:available')
      ipcRenderer.removeAllListeners('update:downloaded')
    },
  },

  platform: process.platform,
  isMac: process.platform === 'darwin',
})
