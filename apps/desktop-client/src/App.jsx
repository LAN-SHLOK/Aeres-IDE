import { useCallback, useEffect, useState } from 'react'
import AuthModal from './AuthModal.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { useStore } from './store.js'
import FileTree from './components/Sidebar/FileTree.jsx'
import SearchPanel from './components/Sidebar/SearchPanel.jsx'
import CodeCanvas from './components/Editor/CodeCanvas.jsx'
import RagChat from './components/Panels/RagChat.jsx'
import ProblemsPanel from './components/Panels/ProblemsPanel.jsx'
import TerminalTabs from './components/Terminal/TerminalTabs.jsx'
import GitPanel from './components/Git/GitPanel.jsx'
import StatusBar from './components/StatusBar.jsx'
import CommandPalette from './components/Overlays/CommandPalette.jsx'
import QuickOpen from './components/Overlays/QuickOpen.jsx'
import KeybindingModal from './components/Overlays/KeybindingModal.jsx'
import DebugToolbar from './components/Editor/DebugToolbar.jsx'
import DebugPanel from './components/Sidebar/DebugPanel.jsx'

import DependencyRadar from './components/Panels/DependencyRadar.jsx'
import FocusSessionManager from './components/Overlays/FocusSessionManager.jsx'
import MutationPanel from './components/Panels/MutationPanel.jsx'
import CausalBlameMap from './components/Panels/CausalBlameMap.jsx'
import ContractSnapshot from './components/Panels/ContractSnapshot.jsx'
import AetherLogo from './components/AetherLogo.jsx'

const SIDEBAR_ICONS = [
  { id: 'files', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>, label: 'Explorer' },
  { id: 'search', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label: 'Search' },
  { id: 'git', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>, label: 'Source Control' },
  { id: 'radar', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: 'Dependency Radar' },
  { id: 'focus', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>, label: 'Focus Sessions' },
  { id: 'mutations', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 22 7.85-7.85"/><path d="M8 14l1.41-1.41"/><path d="M10.83 12.17 11.41 11.59"/><path d="M13.66 10.34 14.24 9.76"/><path d="M16.49 8.51 17.07 7.93"/><path d="M19.31 6.69 19.89 6.11"/><path d="m13.26 3.66 4.7-1.32a2 2 0 0 1 2.5 1.76l.33 4.88c.1 1.4-.8 2.3-1.6 2.5l-4.7 1.32a2 2 0 0 1-2.5-1.76l-.33-4.88c-.1-1.4.8-2.3 1.6-2.5z"/></svg>, label: 'Mutation Testing' },
  { id: 'debug', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="M10 4l1 2"/><path d="M14 4l-1 2"/></svg>, label: 'Debug' },
]

export default function App() {
  const authStatus = useStore((s) => s.authStatus)
  const setAuthStatus = useStore((s) => s.setAuthStatus)
  const setBackendUrl = useStore((s) => s.setBackendUrl)
  const setBackendError = useStore((s) => s.setBackendError)
  const rootPath = useStore((s) => s.rootPath)
  const sidebarWidth = useStore((s) => s.sidebarWidth)
  const activeSidebarTab = useStore((s) => s.activeSidebarTab)
  const setActiveSidebarTab = useStore((s) => s.setActiveSidebarTab)
  const rightPanelOpen = useStore((s) => s.rightPanelOpen)
  const rightPanelWidth = useStore((s) => s.rightPanelWidth)
  const activeRightTab = useStore((s) => s.activeRightTab)
  const setActiveRightTab = useStore((s) => s.setActiveRightTab)
  const toggleRightPanel = useStore((s) => s.toggleRightPanel)
  const terminalPanelOpen = useStore((s) => s.terminalPanelOpen)
  const terminalPanelHeight = useStore((s) => s.terminalPanelHeight)
  const setTerminalPanelHeight = useStore((s) => s.setTerminalPanelHeight)

  const [loaded, setLoaded] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [quickOpenOpen, setQuickOpenOpen] = useState(false)
  const [keybindingsOpen, setKeybindingsOpen] = useState(false)
  const [termDragging, setTermDragging] = useState(false)

  const refreshAuth = useCallback(async () => {
    const e = window.electron
    if (!e) return
    const s = await e.auth.getStatus()
    setAuthStatus({ authenticated: !!s.authenticated, email: s.email ?? null })
  }, [setAuthStatus])

  useEffect(() => {
    const e = window.electron
    if (!e) {
      setAuthStatus({ authenticated: false, email: null })
      setLoaded(true)
      return
    }

    e.auth.onStartup((d) => {
      setAuthStatus({ authenticated: !!d?.authenticated, email: d?.email ?? null })
      setLoaded(true)
    })
    e.auth.onSuccess((d) => {
      setAuthStatus({ authenticated: true, email: d?.email ?? null })
    })
    e.sidecar.onReady(({ port }) => {
      setBackendUrl(`http://127.0.0.1:${port}`)
    })
    e.sidecar.onError(({ message }) => {
      setBackendError(message)
    })

    e.auth.getStatus().then((s) => {
      setAuthStatus({ authenticated: !!s.authenticated, email: s.email ?? null })
      setLoaded(true)
    })

    // Poll for backend health if sidecar didn't report yet
    const pollBackend = async () => {
      try {
        const resp = await fetch('http://127.0.0.1:8008/api/health')
        if (resp.ok) {
          setBackendUrl('http://127.0.0.1:8008')
        }
      } catch (err) {
        /* silent fail */
      }
    }
    pollBackend()
    
    // Initial sidecar port discovery
    if (e.sidecar && e.sidecar.getPort) {
      e.sidecar.getPort().then(port => {
        if (port) setBackendUrl(`http://127.0.0.1:${port}`)
      })
    }

    const interval = setInterval(pollBackend, 10000)
    return () => clearInterval(interval)
  }, [setAuthStatus, setBackendUrl, setBackendError])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const isMod = e.ctrlKey || e.metaKey
      if (isMod && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      } else if (isMod && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        setQuickOpenOpen((v) => !v)
      } else if (isMod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        const state = useStore.getState()
        const activeTab = state.tabs.find(t => t.id === state.activeTabId)
        if (activeTab && window.electron) {
          window.electron.fs.writeFile(activeTab.path, activeTab.content).then(() => {
            state.setTabDirty(activeTab.id, false)
          })
        }
      } else if (isMod && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault()
        window.electron?.fs.openFolder().then((result) => {
          const p = Array.isArray(result) ? result[0] : result
          if (p) {
            useStore.getState().setRootPath(p)
            window.electron.fs.getTree(p).then((t) => useStore.getState().setFileTree(t))
          }
        })
      } else if (isMod && e.key === '`') {
        e.preventDefault()
        useStore.getState().setTerminalPanelOpen(!useStore.getState().terminalPanelOpen)
      } else if (isMod && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('aether:modernize'))
      } else if (isMod && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault()
        useStore.getState().setActiveSidebarTab('git')
      } else if (isMod && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault()
        useStore.getState().setActiveSidebarTab('search')
      } else if (isMod && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault()
        useStore.getState().setActiveSidebarTab('explorer')
      } else if (isMod && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
        useStore.getState().setActiveSidebarTab('debug')
      } else if (isMod && e.key === '/') {
        e.preventDefault()
        setKeybindingsOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Terminal drag resize
  useEffect(() => {
    if (!termDragging) return
    const onMove = (e) => {
      const newH = window.innerHeight - e.clientY - 26 // 26 = statusbar
      setTerminalPanelHeight(Math.max(100, Math.min(newH, 600)))
    }
    const onUp = () => setTermDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [termDragging, setTerminalPanelHeight])

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-aether-bg font-body text-aether-muted">
        Loading…
      </div>
    )
  }

  if (!authStatus.authenticated) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-aether-bg">
        <AuthModal onCheckAgain={refreshAuth} />
      </div>
    )
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-aether-bg font-body text-aether-text">
      {/* ── Title Bar ─────────────────────────────────── */}
      <header className="drag flex h-9 shrink-0 items-center border-b border-aether-border bg-aether-surface px-4">
        <span className="no-drag flex items-center gap-2 font-display text-sm font-semibold text-white">
          <AetherLogo size={22} />
          Aether <span className="text-aether-violet">IDE</span>
        </span>
        {rootPath && (
          <span className="ml-3 truncate text-xs text-aether-muted">
            {rootPath.split(/[/\\]/).slice(-2).join('/')}
          </span>
        )}
      </header>

      {/* ── Main body ─────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-white/[0.04] bg-[#07070c] py-2">
          {SIDEBAR_ICONS.map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => setActiveSidebarTab(id)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-base transition-all duration-200 ${activeSidebarTab === id
                ? 'bg-aether-violet/15 text-aether-violet shadow-[0_0_12px_-3px_rgba(124,58,237,0.3)]'
                : 'text-white/25 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
            >
              {icon}
            </button>
          ))}
          <div className="flex-1" />
          <button
            type="button"
            title="AI Chat & Assistant"
            onClick={toggleRightPanel}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${rightPanelOpen
              ? 'bg-aether-violet/20 text-aether-violet shadow-[0_0_15px_-3px_rgba(124,58,237,0.4)]'
              : 'text-aether-muted hover:text-aether-text'
              }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </button>
        </div>

        {/* Sidebar */}
        <div
          className="shrink-0 overflow-hidden border-r border-white/[0.04] bg-[#050509]"
          style={{ width: sidebarWidth }}
        >
          <ErrorBoundary label="Sidebar">
            {activeSidebarTab === 'files' && <FileTree />}
            {activeSidebarTab === 'search' && <SearchPanel />}
            {activeSidebarTab === 'git' && <GitPanel />}
            {activeSidebarTab === 'radar' && <DependencyRadar />}
            {activeSidebarTab === 'focus' && <FocusSessionManager />}
            {activeSidebarTab === 'mutations' && <MutationPanel />}
            {activeSidebarTab === 'debug' && <DebugPanel />}
          </ErrorBoundary>
        </div>

        {/* Editor + Terminal vertical stack */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Editor area */}
          <div className="min-h-0 flex-1">
            <ErrorBoundary label="Editor">
              <CodeCanvas />
            </ErrorBoundary>
          </div>

          {/* Terminal drag handle */}
          {terminalPanelOpen && (
            <div
              className="h-1 shrink-0 cursor-ns-resize bg-aether-border transition hover:bg-aether-violet"
              onMouseDown={() => setTermDragging(true)}
            />
          )}

          {/* Terminal */}
          {terminalPanelOpen && (
            <div className="shrink-0 border-t border-aether-border" style={{ height: terminalPanelHeight }}>
              <ErrorBoundary label="Terminal">
                <TerminalTabs />
              </ErrorBoundary>
            </div>
          )}
        </div>

        {/* Right panel */}
        {rightPanelOpen && (
          <div
            className="shrink-0 overflow-hidden border-l border-aether-border bg-aether-bg"
            style={{ width: rightPanelWidth }}
          >
            <div className="flex h-8 items-center gap-0 border-b border-aether-border bg-aether-surface overflow-x-auto no-scrollbar">
              {['rag', 'problems', 'causemap', 'contracts'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveRightTab(tab)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase transition shrink-0 ${activeRightTab === tab
                    ? 'text-white border-b-2 border-aether-violet'
                    : 'text-aether-muted hover:text-aether-text'
                    }`}
                >
                  {tab === 'rag' ? 'AI Chat' : tab === 'problems' ? 'Problems' : tab === 'causemap' ? 'Cause Map' : 'Contracts'}
                </button>
              ))}
            </div>
            <div className="h-[calc(100%-2rem)] overflow-hidden">
              <ErrorBoundary label="Right Panel">
                {activeRightTab === 'rag' && <RagChat />}
                {activeRightTab === 'problems' && <ProblemsPanel />}
                {activeRightTab === 'causemap' && <CausalBlameMap />}
                {activeRightTab === 'contracts' && <ContractSnapshot />}
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>

      {/* ── Status Bar ─────────────────────────────────── */}
      <StatusBar />

      {/* ── Overlays ──────────────────────────────────── */}
      <DebugToolbar />
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {quickOpenOpen && <QuickOpen onClose={() => setQuickOpenOpen(false)} />}
      {keybindingsOpen && <KeybindingModal onClose={() => setKeybindingsOpen(false)} />}
    </div>
  )
}
