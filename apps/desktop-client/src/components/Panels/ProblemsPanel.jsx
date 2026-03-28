import { useState } from 'react'
import { useStore } from '../../store.js'

const SEVERITY_ICON = {
  error: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  warning: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
}
const SEVERITY_COLOR = { error: 'text-red-400', warning: 'text-amber-400', info: 'text-blue-400' }

export default function ProblemsPanel() {
  const diagnostics = useStore((s) => s.diagnostics)
  const openTab = useStore((s) => s.openTab)
  const [filter, setFilter] = useState('all')

  const allEntries = Object.entries(diagnostics).flatMap(([filePath, markers]) =>
    (markers || []).map((m) => ({ ...m, filePath }))
  )

  const filtered =
    filter === 'all'
      ? allEntries
      : allEntries.filter((e) => (e.severity || 'warning').toLowerCase() === filter)

  const errors = allEntries.filter((e) => (e.severity || '').toLowerCase() === 'error').length
  const warnings = allEntries.filter((e) => (e.severity || '').toLowerCase() === 'warning').length

  const grouped = {}
  for (const entry of filtered) {
    if (!grouped[entry.filePath]) grouped[entry.filePath] = []
    grouped[entry.filePath].push(entry)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-aether-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-aether-muted">Problems</span>
        <div className="ml-auto flex gap-1">
          {['all', 'error', 'warning'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded px-2 py-0.5 text-[10px] capitalize transition ${
                filter === f ? 'bg-aether-violet/20 text-aether-violet' : 'text-aether-muted hover:text-aether-text'
              }`}
            >
              {f === 'all' ? `All (${allEntries.length})` : f === 'error' ? `Errors (${errors})` : `Warnings (${warnings})`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-aether-muted">
            No problems detected
          </div>
        ) : (
          Object.entries(grouped).map(([filePath, entries]) => (
            <div key={filePath}>
              <div className="sticky top-0 bg-aether-surface px-3 py-1 text-[10px] font-medium text-aether-text">
                {filePath.split(/[/\\]/).pop()}
                <span className="ml-1 text-aether-muted">({entries.length})</span>
              </div>
              {entries.map((entry, i) => {
                const sev = (entry.severity || 'warning').toLowerCase()
                return (
                  <div
                    key={i}
                    onClick={() => {
                      // open file at line
                      openTab({ path: entry.filePath, name: entry.filePath.split(/[/\\]/).pop(), language: 'plaintext', content: '' })
                    }}
                    className="flex cursor-pointer items-start gap-2 px-3 py-1 text-xs transition hover:bg-white/5"
                  >
                    <span className={`mt-0.5 shrink-0 ${SEVERITY_COLOR[sev] || 'text-aether-muted'}`}>
                      {SEVERITY_ICON[sev] || '·'}
                    </span>
                    <span className="min-w-0 flex-1 text-aether-text">{entry.message}</span>
                    <span className="shrink-0 text-aether-muted">{entry.line || ''}</span>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
