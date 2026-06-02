import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store.js'
import { detectLanguage } from '../../utils/langDetect.js'
import { getFileIcon } from '../../utils/getFileIcon.jsx'

function flattenTree(nodes, prefix = '') {
  const result = []
  if (!nodes) return result
  for (const node of nodes) {
    if (node.type === 'file') {
      result.push({ ...node, relativePath: prefix + node.name })
    } else if (node.children) {
      result.push(...flattenTree(node.children, prefix + node.name + '/'))
    }
  }
  return result
}

export default function QuickOpen({ onClose }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const fileTree = useStore((s) => s.fileTree)
  const openTab = useStore((s) => s.openTab)
  const recentlyClosedTabs = useStore((s) => s.recentlyClosedTabs)
  const theme = useStore((s) => s.theme)
  const fileIconTheme = useStore((s) => s.fileIconTheme)

  const allFiles = useMemo(() => flattenTree(fileTree), [fileTree])

  const filtered = useMemo(() => {
    if (!query.trim()) {
      if (recentlyClosedTabs.length > 0) {
        // Show recently opened files
        return recentlyClosedTabs.slice(0, 10).map((t) => ({
          name: t.name,
          path: t.path,
          relativePath: t.name,
          ext: t.name.split('.').pop(),
          type: 'file',
        }))
      }
      // Show first 10 workspace files as default recommendations
      return allFiles.slice(0, 10)
    }
    const q = query.toLowerCase()
    return allFiles
      .filter((f) => f.name.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q))
      .slice(0, 50)
  }, [query, allFiles, recentlyClosedTabs])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelected(0)
  }, [query])

  const openFile = useCallback(
    async (file) => {
      onClose()
      const e = window.electron
      if (!e) return
      try {
        const content = await e.fs.readFile(file.path)
        const lang = detectLanguage(file.name)
        openTab({ path: file.path, name: file.name, language: lang, content })
      } catch (err) {
        console.error('[QuickOpen] read error:', err)
      }
    },
    [onClose, openTab]
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
      if (filtered[selected]) openFile(filtered[selected])
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
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name…"
            className="w-full bg-transparent py-2.5 text-[13px] text-aeres-text placeholder:text-aeres-muted focus:outline-none"
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-aeres-muted italic">
              {!fileTree ? 'Open a folder first' : query ? 'No files found' : 'Type to search files in project...'}
            </div>
          )}
          {filtered.map((file, i) => (
            <div
              key={file.path + i}
              onClick={() => openFile(file)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-1.5 text-[13px] transition-colors ${
                i === selected ? 'bg-aeres-violet text-white' : 'text-aeres-text hover:bg-white/5'
              }`}
            >
              {getFileIcon(file.name, theme, fileIconTheme)}
              <span className="min-w-0 truncate">{file.relativePath || file.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
