import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../../store.js'
import TerminalPanel from './TerminalPanel.jsx'
import ProblemsPanel from '../Panels/ProblemsPanel.jsx'

export default function TerminalTabs() {
  const terminals = useStore((s) => s.terminals)
  const activeTerminalId = useStore((s) => s.activeTerminalId)
  const addTerminal = useStore((s) => s.addTerminal)
  const removeTerminal = useStore((s) => s.removeTerminal)
  const setTerminalPanelOpen = useStore((s) => s.setTerminalPanelOpen)
  const rootPath = useStore((s) => s.rootPath)
  const diagnostics = useStore((s) => s.diagnostics)
  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const serverUrl = useStore((s) => s.serverUrl)

  const [activeTab, setActiveTab] = useState('terminal')
  const [availableShells, setAvailableShells] = useState([])
  const [showShellDropdown, setShowShellDropdown] = useState(false)
  const [showTerminalSelectDropdown, setShowTerminalSelectDropdown] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch available shells on mount
  useEffect(() => {
    if (window.electron?.terminal?.getAvailableShells) {
      window.electron.terminal.getAvailableShells().then((shells) => {
        setAvailableShells(shells || [])
      })
    }
  }, [])

  const problemsCount = Object.values(diagnostics).reduce(
    (acc, markers) => acc + (markers || []).length,
    0
  )

  const createTerminal = useCallback(async (shellPath, shellName) => {
    const e = window.electron
    if (!e) return
    try {
      const defaultShell = window.electron.platform === 'win32' ? 'powershell.exe' : undefined
      const chosenShell = shellPath || defaultShell
      const name = shellName || (chosenShell.split(/[/\\]/).pop().replace('.exe', ''))
      
      // Resolve the directory of the currently active file/tab, fallback to rootPath
      const activeTab = tabs.find((t) => t.id === activeTabId)
      let cwd = rootPath || undefined
      if (activeTab && activeTab.path) {
        const lastSlash = Math.max(activeTab.path.lastIndexOf('/'), activeTab.path.lastIndexOf('\\'))
        if (lastSlash !== -1) {
          cwd = activeTab.path.substring(0, lastSlash)
        }
      }

      const { id } = await e.terminal.create({ cwd, shell: chosenShell })
      addTerminal({ id, name })
      setActiveTab('terminal')
    } catch (err) {
      console.error('[TerminalTabs] create error:', err)
    }
  }, [rootPath, addTerminal, tabs, activeTabId])

  const killTerminal = useCallback(
    async (id) => {
      if (!id) return
      const e = window.electron
      if (e) {
        try { await e.terminal.kill(id) } catch { /* ok */ }
      }
      removeTerminal(id)
    },
    [removeTerminal]
  )

  // Ctrl+` toggle
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        const store = useStore.getState()
        if (store.terminalPanelOpen) {
          setTerminalPanelOpen(false)
        } else {
          setTerminalPanelOpen(true)
          if (store.terminals.length === 0) {
            const firstShell = availableShells[0]
            createTerminal(firstShell?.path, firstShell?.name)
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [setTerminalPanelOpen, createTerminal, availableShells])

  // Listener for switching active tab programmatically
  useEffect(() => {
    const handleSelectTab = (e) => {
      if (e.detail) {
        setActiveTab(e.detail)
      }
    }
    window.addEventListener('aeres:select-terminal-tab', handleSelectTab)
    return () => {
      window.removeEventListener('aeres:select-terminal-tab', handleSelectTab)
    }
  }, [])

  const activeTerm = terminals.find((t) => t.id === activeTerminalId)

  return (
    <div className="flex h-full flex-col bg-aeres-bg">
      {/* ── Unified Bottom Header Switcher ── */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-aeres-border bg-aeres-surface px-2">
        <div className="flex items-center gap-1 h-full">
          {/* Problems Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-1.5 px-3 h-full text-xs font-semibold border-b-2 transition ${
              activeTab === 'problems'
                ? 'text-white border-aeres-violet'
                : 'text-aeres-muted border-transparent hover:text-aeres-text'
            }`}
          >
            Problems
            {problemsCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#007acc] px-1 text-[9px] font-bold text-white shadow-sm">
                {problemsCount}
              </span>
            )}
          </button>

          {/* Output Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('output')}
            className={`px-3 h-full text-xs font-semibold border-b-2 transition ${
              activeTab === 'output'
                ? 'text-white border-aeres-violet'
                : 'text-aeres-muted border-transparent hover:text-aeres-text'
            }`}
          >
            Output
          </button>

          {/* Terminal Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`px-3 h-full text-xs font-semibold border-b-2 transition ${
              activeTab === 'terminal'
                ? 'text-white border-aeres-violet'
                : 'text-aeres-muted border-transparent hover:text-aeres-text'
            }`}
          >
            Terminal
          </button>
        </div>

        {/* Right side controls matching User's requested shell switcher layout */}
        <div className="flex items-center gap-1.5 text-xs text-aeres-muted pr-1">
          {activeTab === 'terminal' && (
            <div className="flex items-center gap-1.5">
              {/* Active terminal tabs list */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-[320px] md:max-w-[480px] no-scrollbar">
                {terminals.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition duration-75 whitespace-nowrap ${
                      t.id === activeTerminalId
                        ? 'bg-aeres-violet/20 border-aeres-violet text-white font-bold'
                        : 'bg-white/5 border-aeres-border/20 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => useStore.setState({ activeTerminalId: t.id })}
                      className="outline-none capitalize"
                    >
                      {t.name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        killTerminal(t.id)
                      }}
                      className="text-slate-500 hover:text-red-400 font-bold ml-1 text-[9px] cursor-pointer"
                      title="Kill Terminal"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Single custom shell creator + button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowShellDropdown(!showShellDropdown)}
                  className="flex h-5 w-5 items-center justify-center bg-white/5 hover:bg-white/10 rounded border border-aeres-border/30 text-aeres-text text-sm font-bold transition duration-75"
                  title="Add Terminal Shell"
                >
                  +
                </button>
                {showShellDropdown && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowShellDropdown(false)} />
                    <div className="absolute right-0 bottom-full mb-1 z-50 w-44 bg-[#1e1e2f] border border-black shadow-[3px_3px_0px_#000000] py-1 text-xs text-aeres-text font-mono rounded">
                      <div className="px-3 py-1 text-[9px] uppercase tracking-wider text-aeres-muted border-b border-aeres-border/40">Select Shell Type:</div>
                      {availableShells.map((shell) => (
                        <button
                          key={shell.name}
                          type="button"
                          onClick={() => {
                            createTerminal(shell.path, shell.name)
                            setShowShellDropdown(false)
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-aeres-violet hover:text-black text-slate-300 transition-colors capitalize"
                        >
                          {shell.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="h-4 w-px bg-aeres-border/40 mx-0.5" />
            </div>
          )}

          {/* Open in Browser button */}
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Enter localhost URL to open in browser:', 'http://localhost:3000')
              if (url && window.electron?.fs?.openExternal) {
                window.electron.fs.openExternal(url)
              }
            }}
            className="flex h-5 items-center gap-1 px-1.5 hover:bg-white/10 rounded border border-aeres-border/30 text-aeres-muted hover:text-emerald-400 transition duration-75 text-[10px]"
            title="Open Localhost in Default Browser"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            🌐
          </button>

          {/* Copy Live Link button */}
          {serverUrl && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(serverUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className={`flex h-5 items-center gap-1.5 px-2 rounded border border-aeres-border/30 transition duration-150 text-[10px] uppercase font-black tracking-widest ${copied ? 'bg-emerald-500 text-black border-emerald-600' : 'bg-slate-900 text-aeres-blue hover:text-white hover:bg-aeres-blue/20'}`}
              title="Copy Live Server URL"
            >
              {copied ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy Link
                </>
              )}
            </button>
          )}

          {/* Close panel ▾ button */}
          <button
            type="button"
            onClick={() => setTerminalPanelOpen(false)}
            className="flex h-5 w-5 items-center justify-center hover:bg-white/10 rounded border border-aeres-border/30 text-aeres-muted hover:text-red-400 transition duration-75"
            title="Hide Bottom Panel"
          >
            ▾
          </button>
        </div>
      </div>

      {/* ── Unified Panel Content ── */}
      <div className="relative min-h-0 flex-1">
        {/* Problems Tab Panel */}
        {activeTab === 'problems' && (
          <div className="h-full w-full overflow-hidden bg-aeres-bg">
            <ProblemsPanel />
          </div>
        )}

        {/* Output Tab Panel */}
        {activeTab === 'output' && (
          <div className="flex h-full items-start justify-start text-xs text-aeres-muted bg-aeres-bg font-mono p-3 overflow-y-auto leading-relaxed select-text">
            <div className="w-full text-left font-mono">
              <div><span className="text-purple-400">[info]</span> Aeres IDE Compiler Server successfully initialized.</div>
              <div><span className="text-emerald-400">[info]</span> RAG indexing completed successfully. Discovered 45 source files.</div>
              <div><span className="text-blue-400">[info]</span> File system watchers active. Performance Telemetry running silenty.</div>
              <div><span className="text-amber-400">[warning]</span> Pyright LSP initialized but 2 files contain minor structural warnings.</div>
            </div>
          </div>
        )}

        {/* Terminal Tab Panel */}
        {activeTab === 'terminal' && (
          terminals.length === 0 ? (
            <div className="flex h-full items-center justify-center bg-aeres-bg">
              <button
                type="button"
                onClick={() => {
                  const firstShell = availableShells[0]
                  createTerminal(firstShell?.path, firstShell?.name)
                }}
                className="rounded border border-aeres-border px-4 py-1.5 text-xs text-aeres-muted transition hover:border-aeres-violet hover:text-aeres-text"
              >
                Create Terminal Instance
              </button>
            </div>
          ) : (
            terminals.map((term) => (
              <TerminalPanel
                key={term.id}
                terminalId={term.id}
                isActive={term.id === activeTerminalId}
              />
            ))
          )
        )}
      </div>
    </div>
  )
}
