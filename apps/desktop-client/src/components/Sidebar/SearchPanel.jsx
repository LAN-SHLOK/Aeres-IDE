import { useCallback, useState } from 'react'
import { useStore } from '../../store.js'

export default function SearchPanel() {
  const rootPath = useStore((s) => s.rootPath)
  const openTab = useStore((s) => s.openTab)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !rootPath) return
    const e = window.electron
    if (!e) return
    setSearching(true)
    try {
      const data = await e.fs.searchInProject({ rootPath, query: query.trim(), caseSensitive })
      setResults(data.results || [])
    } catch (err) {
      console.error('[SearchPanel] error:', err)
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [query, rootPath, caseSensitive])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleResultClick = useCallback(
    async (result) => {
      const e = window.electron
      if (!e) return
      try {
        const content = await e.fs.readFile(result.file)
        const name = result.file.split(/[/\\]/).pop()
        const ext = name.split('.').pop()?.toLowerCase() || ''
        const langMap = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', css: 'css', json: 'json', md: 'markdown', html: 'html' }
        openTab({
          path: result.file,
          name,
          language: langMap[ext] || 'plaintext',
          content,
          line: result.line
        })
      } catch (err) {
        console.error('[SearchPanel] open error:', err)
      }
    },
    [openTab]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center border-b border-aether-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-aether-muted">Search</span>
      </div>
      <div className="p-2">
        <div className="flex gap-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in files…"
            className="flex-1 rounded-md border border-aether-border bg-aether-bg px-2 py-1 text-xs text-aether-text placeholder:text-aether-muted focus:border-aether-violet focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`rounded px-1.5 py-1 text-[10px] transition ${caseSensitive ? 'bg-aether-violet/20 text-aether-violet' : 'text-aether-muted hover:text-aether-text'}`}
            title="Case Sensitive"
          >
            Aa
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searching && (
          <div className="px-3 py-2 text-xs text-aether-muted animate-pulse">Searching…</div>
        )}
        {!searching && results.length === 0 && query && (
          <div className="px-3 py-2 text-xs text-aether-muted">No results</div>
        )}
        {results.map((r, i) => (
          <div
            key={i}
            onClick={() => handleResultClick(r)}
            className="cursor-pointer border-b border-aether-border/50 px-3 py-1.5 transition hover:bg-white/5"
          >
            <div className="truncate text-[10px] text-aether-muted">
              {r.file.split(/[/\\]/).slice(-2).join('/')}:{r.line}
            </div>
            <div className="truncate text-xs text-aether-text">{r.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
