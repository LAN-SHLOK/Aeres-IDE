import { useCallback, useState } from 'react'
import { useStore } from '../../store.js'
import { detectLanguage } from '../../utils/langDetect.js'

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
        const lang = detectLanguage(name)
        openTab({
          path: result.file,
          name,
          language: lang,
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
      <div className="flex h-8 shrink-0 items-center border-b border-aeres-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-aeres-muted">Search</span>
      </div>
      <div className="p-2">
        <div className="flex gap-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in files…"
            className="flex-1 rounded-md border border-aeres-border bg-aeres-bg px-2 py-1 text-xs text-aeres-text placeholder:text-aeres-muted focus:border-aeres-violet focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`rounded px-1.5 py-1 text-[10px] transition ${caseSensitive ? 'bg-aeres-violet/20 text-aeres-violet' : 'text-aeres-muted hover:text-aeres-text'}`}
            title="Case Sensitive"
          >
            Aa
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searching && (
          <div className="flex flex-col gap-2 p-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col gap-1.5 opacity-50">
                <div className="h-2 w-1/3 rounded bg-slate-700/50 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                <div className="h-3 w-3/4 rounded bg-slate-700/50 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              </div>
            ))}
          </div>
        )}
        {!searching && results.length === 0 && query && (
          <div className="px-3 py-2 text-xs text-aeres-muted">No results</div>
        )}
        {results.map((r, i) => (
          <div
            key={i}
            onClick={() => handleResultClick(r)}
            className="cursor-pointer border-b border-aeres-border/50 px-3 py-1.5 transition hover:bg-white/5"
          >
            <div className="truncate text-[10px] text-aeres-muted">
              {r.file.split(/[/\\]/).slice(-2).join('/')}:{r.line}
            </div>
            <div className="truncate text-xs text-aeres-text">{r.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
