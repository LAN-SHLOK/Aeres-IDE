import { useCallback, useEffect } from 'react'
import { useStore } from '../../store.js'
import TerminalPanel from './TerminalPanel.jsx'
import TerminalToolbar from './TerminalToolbar.jsx'

export default function TerminalTabs() {
  const terminals = useStore((s) => s.terminals)
  const activeTerminalId = useStore((s) => s.activeTerminalId)
  const addTerminal = useStore((s) => s.addTerminal)
  const removeTerminal = useStore((s) => s.removeTerminal)
  const setTerminalPanelOpen = useStore((s) => s.setTerminalPanelOpen)
  const rootPath = useStore((s) => s.rootPath)

  const createTerminal = useCallback(async () => {
    const e = window.electron
    if (!e) return
    try {
      const shell = window.electron.platform === 'win32' ? 'powershell.exe' : undefined
      const { id } = await e.terminal.create({ cwd: rootPath || undefined, shell })
      addTerminal({ id, name: `Terminal ${id}` })
    } catch (err) {
      console.error('[TerminalTabs] create error:', err)
    }
  }, [rootPath, addTerminal])

  const killTerminal = useCallback(
    async (id) => {
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
          if (store.terminals.length === 0) createTerminal()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setTerminalPanelOpen, createTerminal])

  return (
    <div className="flex h-full flex-col bg-aether-bg">
      {/* Tab bar */}
      <div className="flex h-8 shrink-0 items-center border-b border-aether-border bg-aether-surface">
        <div className="flex flex-1 items-stretch overflow-x-auto">
          {terminals.map((term) => (
            <div
              key={term.id}
              onClick={() => useStore.setState({ activeTerminalId: term.id })}
              className={`group flex cursor-pointer items-center gap-1.5 border-r border-aether-border px-3 text-xs ${
                term.id === activeTerminalId
                  ? 'bg-aether-bg text-white'
                  : 'text-aether-muted hover:text-aether-text'
              }`}
            >
              <span className="truncate">{term.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  killTerminal(term.id)
                }}
                className="hidden h-4 w-4 items-center justify-center rounded text-aether-muted hover:text-red-400 group-hover:flex"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={createTerminal}
          className="flex h-full w-8 items-center justify-center text-aether-muted transition hover:text-aether-violet"
          title="New Terminal"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setTerminalPanelOpen(false)}
          className="flex h-full w-8 items-center justify-center text-aether-muted transition hover:text-red-400"
          title="Hide Terminal"
        >
          ▾
        </button>
      </div>

      {/* Active terminal toolbar */}
      {activeTerminalId && <TerminalToolbar terminalId={activeTerminalId} onKill={() => killTerminal(activeTerminalId)} />}

      {/* Terminal panels */}
      <div className="relative min-h-0 flex-1">
        {terminals.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <button
              type="button"
              onClick={createTerminal}
              className="rounded-md border border-aether-border px-4 py-2 text-xs text-aether-muted transition hover:border-aether-violet hover:text-aether-text"
            >
              New Terminal
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
        )}
      </div>
    </div>
  )
}
