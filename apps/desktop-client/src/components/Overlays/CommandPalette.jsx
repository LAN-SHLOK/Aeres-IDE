import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../../store.js'

const COMMANDS = [
  { id: 'openFolder', label: 'Open Folder', key: 'Ctrl+O', action: 'openFolder' },
  { id: 'toggleTerminal', label: 'Toggle Terminal', key: 'Ctrl+`', action: 'toggleTerminal' },
  { id: 'sourceControl', label: 'Open Source Control', key: '', action: 'sourceControl' },
  { id: 'modernize', label: 'Modernize Current File', key: 'Ctrl+Shift+M', action: 'modernize' },
  { id: 'scanProject', label: 'Scan Entire Project', key: '', action: 'scanProject' },
  { id: 'formatDocument', label: 'Format Document', key: 'Shift+Alt+F', action: 'format' },
  { id: 'debug', label: 'Start Debugging', key: 'F5', action: 'debug' },
  { id: 'gitCommit', label: 'Git: Commit', key: '', action: 'gitCommit' },
  { id: 'gitPush', label: 'Git: Push', key: '', action: 'gitPush' },
  { id: 'gitPull', label: 'Git: Pull', key: '', action: 'gitPull' },
  { id: 'toggleTheme', label: 'Toggle Theme', key: '', action: 'toggleTheme' },
  { id: 'signOut', label: 'Sign Out', key: '', action: 'signOut' },
]

export default function CommandPalette({ onClose }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelected(0)
  }, [query])

  const executeCommand = useCallback(
    (cmd) => {
      onClose()
      const store = useStore.getState()
      switch (cmd.action) {
        case 'openFolder':
          window.electron?.fs.openFolder().then((result) => {
            const p = Array.isArray(result) ? result[0] : result
            if (p) {
              store.setRootPath(p)
              window.electron.fs.getTree(p).then((t) => store.setFileTree(t))
            }
          })
          break
        case 'modernize':
          window.dispatchEvent(new CustomEvent('aether:modernize'))
          break
        case 'scanProject':
          store.setActiveSidebarTab('radar')
          break
        case 'debug':
          store.setActiveSidebarTab('debug')
          break
        case 'gitCommit':
        case 'gitPush':
        case 'gitPull':
          store.setActiveSidebarTab('git')
          break
        case 'toggleTheme':
          store.toggleTheme()
          break
        case 'signOut':
          window.electron?.auth.logout()
          store.setAuthStatus({ authenticated: false, email: null })
          break
        default:
          break
      }
    },
    [onClose]
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selected]) executeCommand(filtered[selected])
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] overflow-hidden rounded-xl border border-aether-border bg-aether-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-aether-border p-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="> Type a command…"
            className="w-full bg-transparent px-2 py-1.5 text-sm text-aether-text placeholder:text-aether-muted focus:outline-none"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => executeCommand(cmd)}
              className={`flex cursor-pointer items-center justify-between px-4 py-2 text-sm transition ${
                i === selected ? 'bg-aether-violet/20 text-white' : 'text-aether-text hover:bg-white/5'
              }`}
            >
              <span>{cmd.label}</span>
              {cmd.key && (
                <span className="ml-4 rounded bg-aether-bg px-1.5 py-0.5 text-[10px] text-aether-muted">
                  {cmd.key}
                </span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-aether-muted">No commands found</div>
          )}
        </div>
      </div>
    </div>
  )
}
