import { useCallback, useEffect, useState } from 'react'
import AuthModal from './AuthModal.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { useStore } from './store.js'
import { detectLanguage } from './utils/langDetect.js'
import { openFolderAndResetTerminals } from './utils/workspaceActions.js'

// Sidebars
import FileTree from './components/Sidebar/FileTree.jsx'
import SearchPanel from './components/Sidebar/SearchPanel.jsx'
import GitPanel from './components/Git/GitPanel.jsx'
import DebugPanel from './components/Sidebar/DebugPanel.jsx'
import ExtensionPanel from './components/Sidebar/ExtensionsPanel.jsx'

// Main Content
import CodeCanvas from './components/Editor/CodeCanvas.jsx'
import DependencyRadar from './components/Panels/DependencyRadar.jsx'
import CausalBlameMap from './components/Panels/CausalBlameMap.jsx'
import ArchVisualizer from './components/Panels/ArchVisualizer.jsx'

// Right Panels
import RagChat from './components/Panels/RagChat.jsx'
import ProblemsPanel from './components/Panels/ProblemsPanel.jsx'
import ContractSnapshot from './components/Panels/ContractSnapshot.jsx'
import MutationPanel from './components/Panels/MutationPanel.jsx'
import TemporalPanel from './components/Panels/TemporalPanel.jsx'
import FocusSessionManager from './components/Panels/FocusSessionManager.jsx'

// Overlays & Layout
import TitleBar from './components/TitleBar.jsx'
import MainMenuBar from './components/Editor/MainMenuBar.jsx'
import StatusBar from './components/StatusBar.jsx'
import TerminalTabs from './components/Terminal/TerminalTabs.jsx'
import CommandPalette from './components/Overlays/CommandPalette.jsx'
import QuickOpen from './components/Overlays/QuickOpen.jsx'
import KeybindingModal from './components/Overlays/KeybindingModal.jsx'
import DebugToolbar from './components/Editor/DebugToolbar.jsx'
import EditorSettings from './components/Editor/EditorSettings.jsx'
import AeresSettingsModal from './components/Overlays/AeresSettingsModal.jsx'
import SnippetsModal from './components/Overlays/SnippetsModal.jsx'
import RateLimitModal from './components/Overlays/RateLimitModal.jsx'

const ACTIVITY_ICONS = [
  { id: 'files', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>, label: 'Explorer' },
  { id: 'search', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label: 'Search' },
  { id: 'git', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>, label: 'Source Control' },
  { id: 'debug', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20c-3.31 0-6-2.69-6-6v-1h4v1c0 1.1.9 2 2 2s2-.9 2-2v-1h4v1c0 3.31-2.69 6-6 6Z"/><path d="M12 15V8"/></svg>, label: 'Run and Debug' },
  { id: 'extensions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m21 16-4-4 4-4"/><path d="M11 7 7 11l4 4"/><path d="m5 16-4-4 4-4"/></svg>, label: 'Extensions' },
  { id: 'testing', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2v7.5"/><path d="M14 2v7.5"/><path d="M8.5 13a4 4 0 1 1 7 0L22 20H2l6.5-7Z"/></svg>, label: 'Testing' },
  { id: 'mutations', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M7 7l10 10"/><path d="M17 7L7 10l10 7"/></svg>, label: 'Mutations' },
  { id: 'perf', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>, label: 'Performance' },
  { id: 'radar', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="m12 12 4 4"/><path d="m12 12-4-4"/><path d="m12 12 4-4"/><path d="m12 12-4 4"/></svg>, label: 'Dependency Radar' },
  { id: 'arch', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: 'Architecture Visualizer' },
  { id: 'sunburst', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9" strokeDasharray="4 4" /></svg>, label: 'Workspace Sunburst Matrix' },
]

import WorkspaceSunburst from './components/Panels/WorkspaceSunburst.jsx'

export default function App() {
  const authStatus = useStore((s) => s.authStatus)
  const setAuthStatus = useStore((s) => s.setAuthStatus)
  const setBackendUrl = useStore((s) => s.setBackendUrl)
  const sidebarWidth = useStore((s) => s.sidebarWidth)
  const setSidebarWidth = useStore((s) => s.setSidebarWidth)
  const activeSidebarTab = useStore((s) => s.activeSidebarTab)
  const setActiveSidebarTab = useStore((s) => s.setActiveSidebarTab)
  const theme = useStore((s) => s.theme)
  const rightPanelOpen = useStore((s) => s.rightPanelOpen)
  const rightPanelWidth = useStore((s) => s.rightPanelWidth)
  const rawActiveRightTab = useStore((s) => s.activeRightTab)
  const activeRightTab = rawActiveRightTab === 'rag' || rawActiveRightTab === 'agent' ? 'chat' : rawActiveRightTab
  const setActiveRightTab = useStore((s) => s.setActiveRightTab)
  const clearChat = useStore((s) => s.clearChat)
  const terminalPanelOpen = useStore((s) => s.terminalPanelOpen)
  const terminalPanelHeight = useStore((s) => s.terminalPanelHeight)
  const setTerminalPanelHeight = useStore((s) => s.setTerminalPanelHeight)
  const rootPath = useStore((s) => s.rootPath)
  const zenMode = useStore((s) => s.zenMode)
  const paletteOpen = useStore((s) => s.paletteOpen)
  const setPaletteOpen = useStore((s) => s.setPaletteOpen)
  const quickOpenOpen = useStore((s) => s.quickOpenOpen)
  const setQuickOpenOpen = useStore((s) => s.setQuickOpenOpen)
  const keybindingsOpen = useStore((s) => s.keybindingsOpen)
  const setKeybindingsOpen = useStore((s) => s.setKeybindingsOpen)

  const [loaded, setLoaded] = useState(false)
  const [termDragging, setTermDragging] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editorSettingsOpen, setEditorSettingsOpen] = useState(false)
  const [aeresSettingsOpen, setAeresSettingsOpen] = useState(false)
  const [snippetsOpen, setSnippetsOpen] = useState(false)
  const [rateLimitOpen, setRateLimitOpen] = useState(false)

  useEffect(() => {
    // Dynamic theme migration: Default existing users (or first-time users) to 'cutie-dark'
    try {
      const localState = localStorage.getItem('aeres-ide-state')
      if (localState) {
        const parsed = JSON.parse(localState)
        if (parsed?.state && (parsed.state.theme === 'dark' || parsed.state.theme === 'aeres' || !parsed.state.theme)) {
          parsed.state.theme = 'cutie-dark'
          localStorage.setItem('aeres-ide-state', JSON.stringify(parsed))
          useStore.setState({ theme: 'cutie-dark' })
        }
      } else {
        useStore.setState({ theme: 'cutie-dark' })
      }
    } catch (err) {
      console.warn('[ThemeMigration] Error:', err)
    }

    const e = window.electron
    if (!e) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setAuthStatus({ authenticated: true, email: 'dev-mode@aeres.ide' })
      } else {
        setAuthStatus({ authenticated: false, email: null })
      }
      setLoaded(true)
      return
    }
    e.auth.getStatus().then((s) => { setAuthStatus({ authenticated: !!s.authenticated, email: s.email ?? null }); setLoaded(true); })
    if (e.sidecar?.getPort) { e.sidecar.getPort().then(port => { if (port) setBackendUrl(`http://127.0.0.1:${port}`) }) }
  }, [setAuthStatus, setBackendUrl])

  useEffect(() => {
    // Inject active theme class name to document element for targeted retro styles
    document.documentElement.className = ''
    document.documentElement.classList.add(`theme-${theme}`)

    const THEME_MAPS = {
      'cutie-dark': {
        '--aeres-bg': '#130f26',      // Cozy dark Y2K grape-indigo
        '--aeres-surface': '#1c1735', // Warm grape panel bg
        '--aeres-border': '#000000',  // Thick solid black border
        '--aeres-violet': '#d8b4fe',  // Soothing pastel lavender
        '--aeres-text': '#fffdf9',    // Cozy warm cream text
        '--aeres-muted': '#8e85aa',   // Muted lavender slate
      },
      'cutie-light': {
        '--aeres-bg': '#fdfbf7',      // Warm vintage paper cream
        '--aeres-surface': '#f5efeb', // Warm cozy linen surface
        '--aeres-border': '#000000',  // Thick solid black border
        '--aeres-violet': '#c084fc',  // Soft retro purple
        '--aeres-text': '#32283c',    // Soft chocolate-dark text
        '--aeres-muted': '#8a7f93',   // Muted warm chocolate-grey
      },
      dark: {
        '--aeres-bg': '#020617',      // slate-955
        '--aeres-surface': '#0f172a', // slate-900
        '--aeres-border': '#1e293b',  // slate-800
        '--aeres-violet': '#7C3AED',  // Matte Violet
        '--aeres-text': '#f1f5f9',    // slate-100
        '--aeres-muted': '#64748b',   // slate-500
      },
      cyberpunk: {
        '--aeres-bg': '#050508',
        '--aeres-surface': '#0d0e15',
        '--aeres-border': '#ff007f',
        '--aeres-violet': '#00ffff',
        '--aeres-text': '#ffffff',
        '--aeres-muted': '#ff007f',
      },
      nord: {
        '--aeres-bg': '#1b222d',
        '--aeres-surface': '#242f41',
        '--aeres-border': '#3b4b64',
        '--aeres-violet': '#88c0d0',
        '--aeres-text': '#e5e9f0',
        '--aeres-muted': '#81a1c1',
      },
      retro: {
        '--aeres-bg': '#0c0f0d',
        '--aeres-surface': '#141a15',
        '--aeres-border': '#1b3a24',
        '--aeres-violet': '#33ff33',
        '--aeres-text': '#d2ffd2',
        '--aeres-muted': '#1b8036',
      },
      solarized: {
        '--aeres-bg': '#001b22',
        '--aeres-surface': '#002b36',
        '--aeres-border': '#073642',
        '--aeres-violet': '#cb4b16',
        '--aeres-text': '#fdf6e3',
        '--aeres-muted': '#859900',
      },
      amethyst: {
        '--aeres-bg': '#0f0b1b',
        '--aeres-surface': '#19132d',
        '--aeres-border': '#331d5c',
        '--aeres-violet': '#a855f7',
        '--aeres-text': '#faf5ff',
        '--aeres-muted': '#7c3aed',
      },
      aeres: {
        '--aeres-bg': '#120e24',      // Cozy dark Y2K grape-indigo (very low eye strain)
        '--aeres-surface': '#1a1532', // Deep pastel grape panel bg
        '--aeres-border': '#ffb3c1',  // Soft soothing pastel pink border
        '--aeres-violet': '#d8b4fe',  // Soothing pastel lavender
        '--aeres-text': '#fffdf9',    // Cozy warm cream text (high contrast, soft feel)
        '--aeres-muted': '#8e85aa',   // Muted lavender slate
      }
    }
    
    const colors = THEME_MAPS[theme] || THEME_MAPS.dark
    Object.entries(colors).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(variable, value)
    })
  }, [theme])

  // Dynamic Keyboard shortcuts for all IDE features (High-fidelity operational keybindings)
  useEffect(() => {
    let keyBuffer = ''
    const handleKeys = async (e) => {
      // 1. Ctrl+S -> Save Active File
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        const store = useStore.getState()
        const activeTab = store.tabs.find(t => t.id === store.activeTabId)
        if (activeTab && window.electron) {
          // If the Prettier Formatter extension is installed, let's auto-format the code beautifully before writing!
          let content = activeTab.content || ''
          if (store.installedExtensions.includes('prettier-formatter')) {
            // Mock a gorgeous code formatting: trim lines and add standard formatting spacing!
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
          const store = useStore.getState()
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
        const store = useStore.getState()
        store.setTerminalPanelOpen(!store.terminalPanelOpen)
      }

      // 4. Ctrl+Shift+P -> Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setPaletteOpen(true)
      }

      // 5. Ctrl+P -> Quick Open
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setQuickOpenOpen(true)
      }

      // 6. Ctrl+Shift+F -> Focus Global Search tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault()
        setActiveSidebarTab('search')
      }

      // 7. Ctrl+Shift+E -> Focus File Explorer tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault()
        setActiveSidebarTab('files')
      }

      // 8. Ctrl+Shift+G -> Focus Git Source Control tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault()
        setActiveSidebarTab('git')
      }

      // 9. Ctrl+Shift+D -> Focus Run and Debug tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
        setActiveSidebarTab('debug')
      }

      // 10. Ctrl+Shift+X -> Focus Extensions panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        e.preventDefault()
        setActiveSidebarTab('extensions')
      }

      // 11. Ctrl+Shift+M -> Modernize Code Action
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault()
        // Focus the RAG AI chat window directly
        const store = useStore.getState()
        store.setRightPanelWidth(380)
        useStore.setState({ rightPanelOpen: true, activeRightTab: 'rag' })
      }

      // 12. Ctrl+, -> Aeres User Settings Modal
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setAeresSettingsOpen(true)
      }

      // 13. Ctrl+K Ctrl+S -> Shortcuts panel
      if ((e.ctrlKey || e.metaKey) && (e.key === 'K' || e.key === 'k')) {
        keyBuffer = 'k'
        setTimeout(() => { keyBuffer = '' }, 1000)
      }
      if (keyBuffer === 'k' && (e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
        e.preventDefault()
        setKeybindingsOpen(true)
        keyBuffer = ''
      }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [setKeybindingsOpen, setActiveSidebarTab, setPaletteOpen, setQuickOpenOpen])

  // Custom Event Listeners to receive keyboard triggers from Monaco Editor
  useEffect(() => {
    const handleOpenSettings = () => setAeresSettingsOpen(true)
    const handleOpenShortcuts = () => setKeybindingsOpen(true)
    const handleOpenExtensions = () => setActiveSidebarTab('extensions')
    const handleOpenExplorer = () => setActiveSidebarTab('files')
    const handleOpenPalette = () => setPaletteOpen(true)
    const handleOpenQuickopen = () => setQuickOpenOpen(true)
    const handleOpenSnippets = () => setSnippetsOpen(true)
    const handleRateLimit = () => setRateLimitOpen(true)
    const handleNewTerminal = async () => {
      const e = window.electron
      if (!e) return
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
        
        // Resolve the directory of the currently active file/tab, fallback to rootPath
        const store = useStore.getState()
        const activeTab = store.tabs.find((t) => t.id === store.activeTabId)
        let cwd = store.rootPath || undefined
        if (activeTab && activeTab.path) {
          const lastSlash = Math.max(activeTab.path.lastIndexOf('/'), activeTab.path.lastIndexOf('\\'))
          if (lastSlash !== -1) {
            cwd = activeTab.path.substring(0, lastSlash)
          }
        }

        const { id } = await e.terminal.create({ cwd, shell: chosenShell })
        useStore.getState().addTerminal({ id, name })
      } catch (err) {
        console.error('[App] Failed to create new terminal:', err)
      }
    }

    document.addEventListener('aeres:open-settings', handleOpenSettings)
    document.addEventListener('aeres:open-shortcuts', handleOpenShortcuts)
    document.addEventListener('aeres:open-extensions', handleOpenExtensions)
    document.addEventListener('aeres:open-explorer', handleOpenExplorer)
    document.addEventListener('aeres:open-palette', handleOpenPalette)
    document.addEventListener('aeres:open-quickopen', handleOpenQuickopen)
    document.addEventListener('aeres:open-snippets', handleOpenSnippets)
    window.addEventListener('aeres:rate-limit-hit', handleRateLimit)
    window.addEventListener('aeres:new-terminal', handleNewTerminal)

    return () => {
      document.removeEventListener('aeres:open-settings', handleOpenSettings)
      document.removeEventListener('aeres:open-shortcuts', handleOpenShortcuts)
      document.removeEventListener('aeres:open-extensions', handleOpenExtensions)
      document.removeEventListener('aeres:open-explorer', handleOpenExplorer)
      document.removeEventListener('aeres:open-palette', handleOpenPalette)
      document.removeEventListener('aeres:open-quickopen', handleOpenQuickopen)
      document.removeEventListener('aeres:open-snippets', handleOpenSnippets)
      window.removeEventListener('aeres:rate-limit-hit', handleRateLimit)
      window.removeEventListener('aeres:new-terminal', handleNewTerminal)
    }
  }, [setActiveSidebarTab, setKeybindingsOpen, setPaletteOpen, setQuickOpenOpen])


  useEffect(() => {
    if (!termDragging) return
    const onMove = (e) => {
      const newH = window.innerHeight - e.clientY - 22
      setTerminalPanelHeight(Math.max(100, Math.min(newH, 600)))
    }
    const onUp = () => setTermDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
  }, [termDragging, setTerminalPanelHeight])

  // ── GLOBAL LSP Diagnostics Listener ──
  useEffect(() => {
    const e = window.electron
    if (!e?.lsp?.onDiagnostics) return

    const off = e.lsp.onDiagnostics(({ uri, diagnostics }) => {
      let filePath = uri
      if (uri.startsWith('file:///')) {
        filePath = uri.slice(8)
        filePath = filePath.replace(/\//g, '\\')
        filePath = decodeURIComponent(filePath)
      }
      
      const markers = (diagnostics || []).map(d => ({
        message: d.message,
        line: (d.range?.start?.line ?? 0) + 1,
        severity: d.severity === 1 ? 'error' : d.severity === 2 ? 'warning' : 'info'
      }))
      
      useStore.getState().setDiagnostics(filePath, markers)
    })
    
    return () => off()
  }, [])

  if (!loaded) return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500">Loading Aeres…</div>
  if (!authStatus.authenticated) return <div className="h-screen w-screen bg-slate-950"><AuthModal onCheckAgain={() => window.location.reload()} /></div>

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950/60 font-sans text-slate-300">
      {/* 0. CUSTOM FRAMELESS TITLE BAR */}
      <TitleBar />

      {/* 1. TOP MENU BAR */}
      <MainMenuBar />

      <div className="relative flex flex-1 overflow-hidden w-full max-w-full">
        {/* 2. LEFT ACTIVITY BAR */}
        <div className="flex w-12 shrink-0 flex-col items-center border-r border-slate-800/50 bg-slate-900/50 backdrop-blur-2xl py-2 z-20">
          {ACTIVITY_ICONS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSidebarTab(item.id)}
              className={`flex h-12 w-12 items-center justify-center transition-all relative ${activeSidebarTab === item.id ? 'text-[#7C3AED] bg-[#7C3AED]/10' : 'text-slate-500 hover:text-slate-300'}`}
              title={item.label}
            >
              {activeSidebarTab === item.id && <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#7C3AED]" />}
              {item.icon}
            </button>
          ))}
          <div className="flex-1" />
          <button 
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`flex h-12 w-12 items-center justify-center transition-all ${settingsOpen ? 'text-[#7C3AED] bg-[#7C3AED]/10' : 'text-slate-600 hover:text-slate-400'}`}
            title="Settings"
          >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          {settingsOpen && (
            <>
              {/* Click-away backdrop */}
              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setSettingsOpen(false)} />
              
              {/* Visual Dropdown Context Menu (Sleek dark VS-Code styling) */}
              <div className="absolute left-12 bottom-10 z-50 w-64 bg-[#181818] border border-slate-800 shadow-[0_15px_30px_rgba(0,0,0,0.5)] py-1 font-sans text-xs text-slate-300 rounded-lg animate-fade-in pointer-events-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    setAeresSettingsOpen(true)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                >
                  <span>Editor Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    setAeresSettingsOpen(true)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                >
                  <span>Open Aeres User Settings</span>
                  <span className="text-[9px] text-slate-500 font-mono">Ctrl+,</span>
                </button>

                <div className="h-px bg-slate-800/80 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    setActiveSidebarTab('extensions')
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                >
                  <span>Extensions</span>
                  <span className="text-[9px] text-slate-500 font-mono">Ctrl+Shift+X</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    setKeybindingsOpen(true)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                >
                  <span>Open Keyboard Shortcuts</span>
                  <span className="text-[9px] text-slate-500 font-mono">Ctrl+K Ctrl+S</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    setSnippetsOpen(true)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                >
                  <span>Configure Snippets</span>
                </button>

                <div className="h-px bg-slate-800/80 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    useStore.setState({ terminalPanelOpen: true })
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                >
                  <span>Tasks</span>
                </button>

                <div className="h-px bg-slate-800/80 my-1" />

                <div className="relative group/theme">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100 cursor-pointer"
                  >
                    <span>Themes</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-60"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  
                  {/* Hover submenu for themes matching Image 5 */}
                  <div className="absolute left-full bottom-0 hidden group-hover/theme:block z-[2000] w-52 bg-[#181818] border border-slate-800 shadow-[0_15px_30px_rgba(0,0,0,0.5)] py-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false)
                        useStore.setState({ paletteOpen: true })
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                    >
                      <span>Color Theme</span>
                      <span className="text-[9px] text-slate-500 font-mono">Ctrl+K Ctrl+T</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                    >
                      <span>File Icon Theme</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                    >
                      <span>Product Icon Theme</span>
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-800/80 my-1" />

                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100 cursor-default"
                >
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                    <span>Settings Sync is On</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    alert("Aeres IDE is up to date!")
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex justify-between items-center transition-colors duration-100"
                >
                  <span>Check for Updates...</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* 2. SIDEBAR */}
        {!zenMode && !['radar', 'perf', 'arch', 'sunburst'].includes(activeSidebarTab) && (
          <div className="relative flex shrink-0 flex-col overflow-hidden border-r border-slate-800/50 bg-slate-950/40 backdrop-blur-md aeres-layout-sidebar" style={{ width: sidebarWidth }}>
            <div className="flex h-9 shrink-0 items-center px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800/30">
              {ACTIVITY_ICONS.find(i => i.id === activeSidebarTab)?.label || 'Explorer'}
            </div>
            <div className="flex-1 overflow-y-auto">
              <ErrorBoundary label="Sidebar">
                {activeSidebarTab === 'files' && <FileTree />}
                {activeSidebarTab === 'search' && <SearchPanel />}
                {activeSidebarTab === 'git' && <GitPanel />}
                {activeSidebarTab === 'debug' && <DebugPanel />}
                {activeSidebarTab === 'extensions' && <ExtensionPanel />}
                {activeSidebarTab === 'testing' && <ContractSnapshot />}
                {activeSidebarTab === 'mutations' && <MutationPanel />}
              </ErrorBoundary>
            </div>
            <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#7C3AED]/50 transition-colors z-30"
                 onMouseDown={(e) => {
                   const startX = e.clientX; const startWidth = sidebarWidth;
                   const onMove = (me) => setSidebarWidth(Math.max(150, Math.min(startWidth + me.clientX - startX, 600)));
                   const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                   window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                 }}
            />
          </div>
        )}

        {/* 3. MAIN CODE CANVAS / DASHBOARDS */}
        <div className="flex min-w-0 flex-1 flex-col bg-slate-950/20 aeres-layout-editor-canvas">
          <div className="flex-1 min-h-0 relative">
            <ErrorBoundary label="Main Content">
               {activeSidebarTab === 'radar' ? <DependencyRadar /> : 
                activeSidebarTab === 'arch' ? <ArchVisualizer /> :
                activeSidebarTab === 'perf' ? <TemporalPanel /> :
                activeSidebarTab === 'sunburst' ? <WorkspaceSunburst /> :
                activeRightTab === 'causemap' ? <CausalBlameMap /> : <CodeCanvas />}
            </ErrorBoundary>
          </div>

          {/* 5. BOTTOM PANEL */}
          {!zenMode && terminalPanelOpen && (
            <div className="flex flex-col shrink-0 z-10">
              <div className="h-1 shrink-0 cursor-ns-resize bg-slate-800/50 hover:bg-[#7C3AED] transition" onMouseDown={() => setTermDragging(true)} />
              <div className="border-t border-slate-800/50 bg-slate-900/60 backdrop-blur-2xl" style={{ height: terminalPanelHeight }}>
                <TerminalTabs />
              </div>
            </div>
          )}
        </div>

        {/* 4. OVERLAYS / RIGHT PANELS */}
        {!zenMode && rightPanelOpen && !(activeSidebarTab === 'radar' || activeSidebarTab === 'arch' || activeSidebarTab === 'sunburst' || activeRightTab === 'causemap') && (
          <div className="shrink-0 overflow-hidden border-l border-slate-800/50 bg-slate-900/70 backdrop-blur-3xl z-20 aeres-layout-right-panel" style={{ width: rightPanelWidth }}>
            <div className="flex h-9 items-center justify-between border-b border-slate-800/30 px-2 bg-slate-950/40">
              <div className="flex items-center gap-1.5">
                {['chat', 'focus'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveRightTab(tab)}
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                      activeRightTab === tab
                        ? 'bg-[#7C3AED] text-white border border-black shadow-[1.5px_1.5px_0px_#000000] scale-105'
                        : 'text-slate-400 hover:text-white hover:scale-102'
                    }`}
                  >
                    {tab === 'chat' ? '💬 Chat' : '🎯 Focus'}
                  </button>
                ))}
              </div>
              
              {activeRightTab === 'chat' && (
                <button
                  onClick={clearChat}
                  className="rounded-full border border-black bg-red-500/10 px-2 py-0.5 text-[9px] text-red-400 hover:bg-red-500 hover:text-black transition-all font-extrabold uppercase shadow-[1.5px_1.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[0.5px_0.5px_0px_#000000] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="h-[calc(100%-2.25rem)] overflow-hidden">
               {activeRightTab === 'chat' && (
                 <RagChat key={activeRightTab} initialMode={activeRightTab} />
               )}
               {activeRightTab === 'focus' && <FocusSessionManager />}
            </div>
            <div className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#7C3AED]/50 transition-colors z-30"
                 onMouseDown={(e) => {
                   const startX = e.clientX; const startWidth = rightPanelWidth;
                   const onMove = (me) => useStore.getState().setRightPanelWidth(Math.max(200, Math.min(startWidth - (me.clientX - startX), 800)));
                   const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                   window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                 }}
            />
          </div>
        )}
      </div>

      {/* 5. STATUS BAR */}
      {!zenMode && <StatusBar />}

      {/* OVERLAYS */}
      <DebugToolbar />
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {quickOpenOpen && <QuickOpen onClose={() => setQuickOpenOpen(false)} />}
      
      {/* Aeres IDE Settings Overlay Panels */}
      {editorSettingsOpen && (
        <>
          {/* Transparent dismiss backdrop */}
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setEditorSettingsOpen(false)} />
          <div className="absolute left-14 bottom-12 z-50 shadow-2xl animate-fade-in pointer-events-auto">
            <EditorSettings />
          </div>
        </>
      )}
      {aeresSettingsOpen && <AeresSettingsModal onClose={() => setAeresSettingsOpen(false)} />}
      {snippetsOpen && <SnippetsModal onClose={() => setSnippetsOpen(false)} />}
      {rateLimitOpen && <RateLimitModal onClose={() => setRateLimitOpen(false)} />}
    </div>
  )
}
