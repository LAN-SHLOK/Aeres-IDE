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
  { id: 'changeTheme', label: 'Change Color Theme', key: 'Ctrl+K Ctrl+T', action: 'changeTheme' },
  { id: 'zenMode', label: 'Toggle Zen Mode (Distraction Free)', key: 'Alt+Z', action: 'zenMode' },
  { id: 'sunburst', label: 'Visualize Workspace Structure (Sunburst)', key: '', action: 'sunburst' },
  { id: 'typewriter', label: 'Toggle Typewriter Mode', key: '', action: 'typewriter' },
  { id: 'closeAllTabs', label: 'Close All Tabs', key: '', action: 'closeAllTabs' },
  { id: 'closeOtherTabs', label: 'Close Other Tabs', key: '', action: 'closeOtherTabs' },
  { id: 'signOut', label: 'Sign Out', key: '', action: 'signOut' },
]

const THEMES = [
  { id: 'dark', label: 'Aeres Dark (Default)' },
  { id: 'cutie-dark', label: 'Cutie Dark' },
  { id: 'cutie-light', label: 'Cutie Light' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon' },
  { id: 'nord', label: 'Nord Ice' }
]

export default function CommandPalette({ onClose }) {
  const [mode, setMode] = useState('commands') // 'commands' | 'themes'
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  const currentList = mode === 'commands' ? COMMANDS : THEMES

  const filtered = currentList.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
    return () => clearTimeout(focusTimer)
  }, [])

  useEffect(() => {
    setSelected(0)
  }, [query, mode])

  const executeCommand = useCallback(
    (cmd) => {
      if (mode === 'themes') {
        useStore.getState().setTheme(cmd.id)
        onClose()
        return
      }

      const store = useStore.getState()
      switch (cmd.action) {
        case 'openFolder':
          onClose()
          window.electron?.fs.openFolder().then((result) => {
            const p = Array.isArray(result) ? result[0] : result
            if (p) {
              store.setRootPath(p)
              window.electron.fs.getTree(p).then((t) => store.setFileTree(t))
            }
          })
          break
        case 'modernize':
          onClose()
          window.dispatchEvent(new CustomEvent('aeres:modernize'))
          break
        case 'scanProject':
          onClose()
          store.setActiveSidebarTab('radar')
          break
        case 'debug':
          onClose()
          store.setActiveSidebarTab('debug')
          break
        case 'gitCommit':
        case 'gitPush':
        case 'gitPull':
          onClose()
          store.setActiveSidebarTab('git')
          break
        case 'changeTheme':
          setMode('themes')
          setQuery('')
          setSelected(0)
          break
        case 'zenMode':
          onClose()
          store.toggleZenMode()
          break
        case 'typewriter':
          onClose()
          store.toggleTypewriterMode()
          break
        case 'sunburst':
          onClose()
          store.setActiveSidebarTab('sunburst')
          break
        case 'closeAllTabs':
          onClose()
          store.closeAllTabs()
          break
        case 'closeOtherTabs':
          onClose()
          const active = store.tabs.find(t => t.id === store.activeTabId)
          if (active) {
            const pinned = store.tabs.filter(t => t.isPinned && t.id !== active.id)
            useStore.setState({ tabs: [...pinned, active] })
          }
          break
        case 'signOut':
          onClose()
          window.electron?.auth.logout()
          store.setAuthStatus({ authenticated: false, email: null })
          break
        default:
          onClose()
          break
      }
    },
    [onClose, mode]
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (mode === 'themes') {
        setMode('commands')
        setQuery('')
      } else {
        onClose()
      }
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
      className="fixed inset-0 z-[9000] flex items-start justify-center bg-black/40 pt-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] overflow-hidden rounded-md border border-aeres-border bg-aeres-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-aeres-border bg-aeres-bg px-3">
          <span className="text-aeres-muted mr-2 font-mono text-[11px] font-bold">
            {mode === 'themes' ? 'Theme >' : '>'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'themes' ? "Select Color Theme" : "Type a command…"}
            className="w-full bg-transparent py-2.5 text-[12px] text-aeres-text placeholder:text-aeres-muted focus:outline-none"
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto py-1">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => executeCommand(cmd)}
              className={`flex cursor-pointer items-center justify-between px-4 py-1.5 text-[12px] font-medium transition-colors ${
                i === selected ? 'bg-aeres-violet text-black font-semibold' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <span>{cmd.label}</span>
              {cmd.key && mode === 'commands' && (
                <span className={`ml-4 rounded px-1.5 py-0.5 text-[10px] ${i === selected ? 'bg-black/20 text-black' : 'bg-aeres-bg text-aeres-muted'}`}>
                  {cmd.key}
                </span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-aeres-muted italic">No results found</div>
          )}
        </div>
      </div>
    </div>
  )
}
