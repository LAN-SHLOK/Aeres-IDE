import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store.js'

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

  const allFiles = useMemo(() => flattenTree(fileTree), [fileTree])

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recently opened files
      return recentlyClosedTabs.slice(0, 10).map((t) => ({
        name: t.name,
        path: t.path,
        relativePath: t.name,
        ext: t.name.split('.').pop(),
        type: 'file',
      }))
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
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        const langMap = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', css: 'css', json: 'json', md: 'markdown', html: 'html' }
        openTab({ path: file.path, name: file.name, language: langMap[ext] || 'plaintext', content })
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
            placeholder="Search files by name…"
            className="w-full bg-transparent px-2 py-1.5 text-sm text-aether-text placeholder:text-aether-muted focus:outline-none"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-aether-muted">
              {query ? 'No files found' : 'Open a folder first'}
            </div>
          )}
          {filtered.map((file, i) => (
            <div
              key={file.path + i}
              onClick={() => openFile(file)}
              className={`flex cursor-pointer items-center gap-2 px-4 py-1.5 text-sm transition ${
                i === selected ? 'bg-aether-violet/20 text-white' : 'text-aether-text hover:bg-white/5'
              }`}
            >
              <span className="rounded bg-aether-bg px-1 py-px text-[9px] font-bold uppercase text-aether-muted">
                {file.ext || '?'}
              </span>
              <span className="min-w-0 truncate">{file.relativePath || file.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
