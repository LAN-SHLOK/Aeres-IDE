// Extension Host
// Evaluates third-party JS securely (as much as possible in this environment)

import { useStore } from '../store.js'

class ExtensionHost {
  constructor() {
    this.activeExtensions = new Map()
    this.eventListeners = new Map()
  }

  // API exposed to extensions
  getApi() {
    return {
      log: (msg) => {
        const store = useStore.getState()
        if (store.appendOutputLog) {
          store.appendOutputLog('info', msg)
        } else {
          console.log(`[Extension] ${msg}`)
        }
      },
      showNotification: (msg) => {
        const store = useStore.getState()
        if (store.appendOutputLog) store.appendOutputLog('success', msg)
      },
      fs: window.electron?.fs || {},
      git: window.electron?.git || {},
      ai: window.electron?.rag || {},
      workspace: {
        getRootPath: () => useStore.getState().rootPath
      },
      onDidSaveTextDocument: (callback) => this.onDidSaveTextDocument(callback)
    }
  }

  // Load a real extension from the filesystem
  async loadExtension(id) {
    if (this.activeExtensions.has(id)) return
    
    console.log(`[ExtensionHost] Loading extension: ${id}`)
    
    const store = useStore.getState()
    const rootPath = store.rootPath
    if (!rootPath || !window.electron?.fs) return

    const extPath = `${rootPath}/extensions/${id}/main.js`.replace(/\\/g, '/')
    
    try {
      const code = await window.electron.fs.readFile(extPath)
      
      // Sandbox environment
      const module = { exports: {} }
      const context = { subscriptions: [] }
      const api = this.getApi()
      
      // Evaluate the code
      const fn = new Function('module', 'exports', 'context', 'api', code)
      fn(module, module.exports, context, api)
      
      const extension = module.exports
      
      if (extension && extension.activate) {
        console.log(`[ExtensionHost] Activated ${id}`)
        extension.activate(context, api)
        this.activeExtensions.set(id, { extension, context })
      }
    } catch (e) {
      console.error(`[ExtensionHost] Failed to load extension ${id}:`, e)
    }
  }

  async unloadExtension(id) {
    const active = this.activeExtensions.get(id)
    if (active) {
      if (active.extension.deactivate) {
        try {
          active.extension.deactivate()
        } catch (e) {
          console.error(`[ExtensionHost] Error deactivating ${id}:`, e)
        }
      }
      active.context.subscriptions.forEach(unsub => {
        if (typeof unsub === 'function') unsub()
      })
      this.activeExtensions.delete(id)
      console.log(`[ExtensionHost] Unloaded extension: ${id}`)
    }
  }

  onDidSaveTextDocument(callback) {
    if (!this.eventListeners.has('onDidSaveTextDocument')) {
      this.eventListeners.set('onDidSaveTextDocument', new Set())
    }
    this.eventListeners.get('onDidSaveTextDocument').add(callback)
    
    return () => {
      this.eventListeners.get('onDidSaveTextDocument').delete(callback)
    }
  }

  // Called by IDE when a document is saved (e.g. from CodeCanvas or Keyboard shortcuts)
  triggerSave(doc) {
    const listeners = this.eventListeners.get('onDidSaveTextDocument')
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb(doc)
        } catch (e) {
          console.error('[ExtensionHost] Error in save listener:', e)
        }
      })
    }
  }

  // Run an extension manually
  async executeRun(id) {
    const entry = this.activeExtensions.get(id)
    if (entry && entry.extension && typeof entry.extension.run === 'function') {
      try {
        console.log(`[ExtensionHost] Manually running extension: ${id}`)
        await entry.extension.run(entry.context, this.getApi())
      } catch (e) {
        console.error(`[ExtensionHost] Error running extension ${id}:`, e)
        const store = useStore.getState()
        if (store.appendOutputLog) store.appendOutputLog('error', `Extension "${id}" error: ${e.message}`)
      }
    } else {
      console.warn(`[ExtensionHost] Extension ${id} does not support manual run or is not loaded.`)
      // Try to load it first, then run
      if (!entry) {
        try {
          await this.loadExtension(id)
          const retryEntry = this.activeExtensions.get(id)
          if (retryEntry && retryEntry.extension && typeof retryEntry.extension.run === 'function') {
            await retryEntry.extension.run(retryEntry.context, this.getApi())
            return
          }
        } catch (e) {
          console.error(`[ExtensionHost] Failed to auto-load and run ${id}:`, e)
        }
      }
      const store = useStore.getState()
      if (store.appendOutputLog) store.appendOutputLog('warn', `Extension "${id}" does not have a run() function.`)
    }
  }

  // Clear all event listeners (used when reloading IDE or unloading)
  clearListeners() {
    this.eventListeners.clear()
  }

  // Unload an extension from memory
  unloadExtension(id) {
    if (this.activeExtensions.has(id)) {
      const ext = this.activeExtensions.get(id)
      if (ext && typeof ext.deactivate === 'function') {
        try {
          ext.deactivate()
        } catch (e) {
          console.error(`[ExtensionHost] Error deactivating ${id}:`, e)
        }
      }
      this.activeExtensions.delete(id)
      console.log(`[ExtensionHost] Unloaded ${id}`)
    }
  }
}

export const extensionHost = new ExtensionHost()
window.aeresExtensionHost = extensionHost;
