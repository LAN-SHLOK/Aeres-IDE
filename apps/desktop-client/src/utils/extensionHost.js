// Extension Host Stub
// In a full implementation, this would spawn a sandboxed iframe or Node.js process 
// to execute third-party code securely.

class ExtensionHost {
  constructor() {
    this.activeExtensions = new Map()
    this.eventListeners = new Map()
  }

  // Load a mockup extension
  async loadExtension(id) {
    if (this.activeExtensions.has(id)) return
    
    console.log(`[ExtensionHost] Loading extension: ${id}`)
    
    // Simulate fetching and parsing extension bundle
    const extension = {
      id,
      activate: (context) => {
        console.log(`[ExtensionHost] Activated ${id}`)
        context.subscriptions.push(
          this.onDidSaveTextDocument((doc) => {
            if (id === 'prettier-formatter') {
              console.log(`[Prettier] Formatting document...`)
            }
          })
        )
      },
      deactivate: () => {
        console.log(`[ExtensionHost] Deactivated ${id}`)
      }
    }

    const context = { subscriptions: [] }
    extension.activate(context)
    this.activeExtensions.set(id, { extension, context })
  }

  async unloadExtension(id) {
    const active = this.activeExtensions.get(id)
    if (active) {
      if (active.extension.deactivate) {
        active.extension.deactivate()
      }
      active.context.subscriptions.forEach(unsub => unsub())
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

  // Called by IDE when a document is saved
  triggerSave(doc) {
    const listeners = this.eventListeners.get('onDidSaveTextDocument')
    if (listeners) {
      listeners.forEach(cb => cb(doc))
    }
  }
}

export const extensionHost = new ExtensionHost()
