import { useStore } from './store.js'
import { openFolderAndResetTerminals } from './utils/workspaceActions.js'

let keyBuffer = ''

export const handleGlobalKeys = async (e, callbacks) => {
  const { setAeresSettingsOpen } = callbacks
  const store = useStore.getState()
  
  // 1. Ctrl+S -> Save Active File
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    const activeTab = store.tabs.find(t => t.id === store.activeTabId)
    if (activeTab && window.electron) {
      let content = activeTab.content || ''
      if (store.installedExtensions.includes('prettier-formatter')) {
        content = content
          .split('\n')
          .map(line => line.trimEnd())
          .join('\n')
        store.setTabContent(store.activeTabId, content)
      }
      await window.electron.fs.writeFile(activeTab.path, content)
      store.setTabDirty(store.activeTabId, false)
    }
  }

  // Ctrl+Shift+S -> Save Focus Session
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
    e.preventDefault()
    const sessionName = window.prompt('Enter a name for your Focus Session:')
    if (sessionName) {
      store.saveSession(sessionName).then((result) => {
        if (result && !result.error) {
          alert(`Focus Session "${sessionName}" saved successfully!`)
          document.dispatchEvent(new CustomEvent('aeres:focus-sessions-updated'))
        } else {
          alert('Failed to save Focus Session: ' + (result?.error || 'Unknown error'))
        }
      }).catch((err) => {
        alert('Failed to save Focus Session: ' + err.message)
      })
    }
  }

  // 2. Ctrl+O -> Open Folder Picker (with terminal reset)
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'O' || e.key === 'o')) {
    e.preventDefault()
    await openFolderAndResetTerminals()
  }

  // 2b. Ctrl+Shift+N -> New Window
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
    e.preventDefault()
    window.electron?.window?.newWindow()
  }

  // 3. Ctrl + ` -> Toggle Terminal
  if ((e.ctrlKey || e.metaKey) && e.key === '`') {
    e.preventDefault()
    store.setTerminalPanelOpen(!store.terminalPanelOpen)
  }

  // 4. Ctrl+Shift+P -> Command Palette
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
    e.preventDefault()
    store.setPaletteOpen(true)
  }

  // 5. Ctrl+P -> Quick Open
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'P' || e.key === 'p')) {
    e.preventDefault()
    store.setQuickOpenOpen(true)
  }

  // 6. Ctrl+Shift+F -> Focus Global Search tab
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
    e.preventDefault()
    store.setActiveSidebarTab('search')
  }

  // 7. Ctrl+Shift+E -> Focus File Explorer tab
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
    e.preventDefault()
    store.setActiveSidebarTab('files')
  }

  // 8. Ctrl+Shift+G -> Focus Git Source Control tab
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
    e.preventDefault()
    store.setActiveSidebarTab('git')
  }

  // 9. Ctrl+Shift+D -> Focus Run and Debug tab
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
    e.preventDefault()
    store.setActiveSidebarTab('debug')
  }

  // 10. Ctrl+Shift+X -> Focus Extensions panel
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
    e.preventDefault()
    store.setActiveSidebarTab('extensions')
  }

  // 11. Ctrl+Shift+M -> Modernize Code Action
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
    e.preventDefault()
    store.setRightPanelWidth(380)
    useStore.setState({ rightPanelOpen: true, activeRightTab: 'rag' })
  }

  // 12. Ctrl+, -> Aeres User Settings Modal
  if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault()
    if (setAeresSettingsOpen) setAeresSettingsOpen({})
  }

  // 13. Ctrl+K Ctrl+S -> Shortcuts panel
  if ((e.ctrlKey || e.metaKey) && (e.key === 'K' || e.key === 'k')) {
    keyBuffer = 'k'
    setTimeout(() => { keyBuffer = '' }, 1000)
  }
  if (keyBuffer === 'k' && (e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
    e.preventDefault()
    store.setKeybindingsOpen(true)
    keyBuffer = ''
  }

  // 14. Alt+L -> Open with Live Server (for HTML files)
  if (e.altKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault()
    document.dispatchEvent(new CustomEvent('aeres:open-live-server'))
  }
}
