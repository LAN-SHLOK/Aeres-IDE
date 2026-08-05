/**
 * Shared Workspace Actions
 * Centralized logic for opening folders and resetting terminals
 * so every call site (Ctrl+O, FileTree, WelcomeScreen, MainMenu, CommandPalette)
 * behaves consistently.
 */
import { useStore } from '../store.js'

/**
 * Opens a folder picker, updates the workspace rootPath & fileTree,
 * kills all existing terminals, and spawns a fresh terminal at the new cwd.
 *
 * @returns {Promise<string|null>} The selected folder path, or null if cancelled.
 */
export async function openFolderAndResetTerminals() {
  const e = window.electron
  if (!e) {
    alert("electron/tauri bridge is not defined!")
    return null
  }

  const result = await e.fs.openFolder()
  if (!result) {
    // If we're not in Tauri (e.g. Chrome), dialogOpen throws an error and returns null
    if (!window.__TAURI_INTERNALS__ && !window.__TAURI_IPC__) {
      alert("⚠️ You are running the IDE in a Web Browser! Native folder picking is disabled. Please open the actual Aeres IDE Desktop App window.")
    }
    return null
  }

  const folderPath = Array.isArray(result) ? result[0] : result
  if (!folderPath) return null

  const store = useStore.getState()

  // 1. Update workspace root path
  store.setRootPath(folderPath)

  // 2. Refresh the file tree
  let tree = await e.fs.getTree(folderPath)
  // Normalize: if Rust returns root object, extract children
  if (tree && !Array.isArray(tree) && tree.children) {
    tree = tree.children
  }
  if (!Array.isArray(tree)) tree = []
  store.setFileTree(tree)

  // 3. Kill all existing terminals (they point to the old folder)
  const existingTerminals = store.terminals || []
  for (const term of existingTerminals) {
    try {
      await e.terminal.kill(term.id)
    } catch { /* already dead */ }
  }
  // Clear terminals and tabs from store to ensure new terminals don't sync to old tab paths
  useStore.setState({ terminals: [], activeTerminalId: null, tabs: [], activeTabId: null })

  // 4. Spawn a fresh terminal at the new folder
  try {
    const defaultShell = e.platform === 'win32' ? 'powershell.exe' : undefined
    let chosenShell = defaultShell
    let name = 'powershell'
    if (e.terminal?.getAvailableShells) {
      const shells = await e.terminal.getAvailableShells()
      if (shells && shells.length > 0) {
        chosenShell = shells[0].path
        name = shells[0].name
      }
    }
    name = name || (chosenShell ? chosenShell.split(/[/\\]/).pop().replace('.exe', '') : 'terminal')

    const { id } = await e.terminal.create({ cwd: folderPath, shell: chosenShell })
    store.addTerminal({ id, name })
  } catch (err) {
    console.error('[workspaceActions] Failed to create terminal after folder change:', err)
  }

  return folderPath
}

/**
 * Opens a folder picker and opens the selected folder in a brand new IDE window.
 * The current window is left untouched.
 *
 * @returns {Promise<void>}
 */
export async function openFolderInNewWindow() {
  const e = window.electron
  if (!e) return

  // First open a new window, then let the user pick a folder in it
  await e.window.newWindow()
}
