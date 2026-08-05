import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store.js'
import { Database, Table2, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Eye, RotateCcw, Play, Loader2, AlertTriangle, Rows3, Columns3 } from 'lucide-react'

const DB_EXTENSIONS = ['.db', '.sqlite', '.sqlite3', '.s3db', '.sl3']

export function isDatabaseFile(name) {
  if (!name) return false
  const lower = name.toLowerCase()
  return DB_EXTENSIONS.some(ext => lower.endsWith(ext))
}

export default function DatabaseViewer() {
  const tabs = useStore(s => s.tabs)
  const activeTabId = useStore(s => s.activeTabId)
  const backendUrl = useStore(s => s.backendUrl)
  const activeTab = tabs.find(t => t.id === activeTabId)

  const [tables, setTables] = useState([])
  const [views, setViews] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [customQuery, setCustomQuery] = useState('')
  const [queryMode, setQueryMode] = useState(false)
  const [queryResult, setQueryResult] = useState(null)

  const PAGE_SIZE = 100
  const filePath = activeTab?.path

  // Fetch table list when db file changes
  useEffect(() => {
    if (!filePath || !backendUrl) return
    setLoading(true)
    setError(null)
    setSelectedTable(null)
    setColumns([])
    setRows([])
    setTables([])
    setViews([])
    setQueryResult(null)

    fetch(`${backendUrl}/api/db/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setTables(data.tables || [])
        setViews(data.views || [])
        if (data.tables?.length > 0) {
          setSelectedTable(data.tables[0].name)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [filePath, backendUrl])

  // Fetch rows when selected table or page changes
  useEffect(() => {
    if (!selectedTable || !filePath || !backendUrl || queryMode) return
    setTableLoading(true)
    setError(null)
    setColumns([])
    setRows([])
    setTotal(0)

    fetch(`${backendUrl}/api/db/table`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: filePath,
        table: selectedTable,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.detail || `HTTP ${res.status}`)
          }).catch(() => {
            throw new Error(`HTTP ${res.status}`)
          })
        }
        return res.json()
      })
      .then(data => {
        setColumns(data.columns || [])
        setRows(data.rows || [])
        setTotal(data.total || 0)
      })
      .catch(err => setError(err.message))
      .finally(() => setTableLoading(false))
  }, [selectedTable, page, filePath, backendUrl, queryMode])

  const handleRunQuery = useCallback(() => {
    if (!customQuery.trim() || !filePath || !backendUrl) return
    setTableLoading(true)
    setError(null)
    setQueryResult(null)

    fetch(`${backendUrl}/api/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, table: customQuery, limit: 500 }),
    })
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.detail || `HTTP ${res.status}`) })
        return res.json()
      })
      .then(data => {
        setQueryResult(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setTableLoading(false))
  }, [customQuery, filePath, backendUrl])

  // Sorting logic (client side on current page)
  const displayRows = useMemo(() => {
    const source = queryMode && queryResult ? queryResult.rows : rows
    if (!sortCol) return source
    return [...source].sort((a, b) => {
      const av = a[sortCol]
      const bv = b[sortCol]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const comp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? comp : -comp
    })
  }, [rows, queryResult, queryMode, sortCol, sortDir])

  const displayColumns = queryMode && queryResult
    ? queryResult.columns.map((name, i) => ({ cid: i, name, type: '', pk: false, notnull: false }))
    : columns

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const handleSort = (colName) => {
    if (sortCol === colName) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colName)
      setSortDir('asc')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (!activeTab) return null

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--aeres-bg)] text-[var(--aeres-text)]">
      {/* ─── LEFT: Table List Sidebar ─── */}
      <div className="flex w-56 shrink-0 flex-col border-r border-[var(--aeres-border)]/30 bg-[var(--aeres-surface)]/60 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--aeres-border)]/20 px-3 py-2.5">
          <Database className="h-4 w-4 text-[var(--aeres-violet)]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--aeres-muted)]">
            Tables
          </span>
          <span className="ml-auto rounded-full bg-[var(--aeres-violet)]/15 px-1.5 py-0.5 text-[9px] font-bold text-[var(--aeres-violet)]">
            {tables.length}
          </span>
        </div>

        {/* Search */}
        <div className="px-2 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--aeres-muted)]/60" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Filter tables..."
              className="w-full rounded-lg border border-[var(--aeres-border)]/20 bg-black/20 py-1.5 pl-7 pr-2 text-[11px] text-[var(--aeres-text)] placeholder-[var(--aeres-muted)]/40 outline-none focus:border-[var(--aeres-violet)]/50 transition-colors"
            />
          </div>
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto px-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--aeres-violet)]" />
            </div>
          ) : (
            <>
              {filteredTables.map(t => (
                <button
                  key={t.name}
                  onClick={() => { setSelectedTable(t.name); setPage(0); setQueryMode(false); setSortCol(null) }}
                  className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition-all duration-150 ${
                    selectedTable === t.name && !queryMode
                      ? 'bg-[var(--aeres-violet)]/15 text-[var(--aeres-violet)] font-semibold shadow-sm'
                      : 'text-[var(--aeres-muted)] hover:bg-white/5 hover:text-[var(--aeres-text)]'
                  }`}
                >
                  <Table2 className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                    selectedTable === t.name && !queryMode ? 'text-[var(--aeres-violet)]' : 'text-[var(--aeres-muted)]/50 group-hover:text-[var(--aeres-muted)]'
                  }`} />
                  <span className="truncate">{t.name}</span>
                  <span className="ml-auto shrink-0 rounded bg-white/5 px-1 py-0.5 text-[9px] font-mono text-[var(--aeres-muted)]/60">
                    {t.row_count >= 0 ? t.row_count.toLocaleString() : '?'}
                  </span>
                </button>
              ))}

              {views.length > 0 && (
                <>
                  <div className="mt-3 mb-1 flex items-center gap-1.5 px-2 text-[9px] font-bold uppercase tracking-widest text-[var(--aeres-muted)]/50">
                    <Eye className="h-3 w-3" /> Views
                  </div>
                  {views.map(v => (
                    <button
                      key={v.name}
                      onClick={() => { setSelectedTable(v.name); setPage(0); setQueryMode(false); setSortCol(null) }}
                      className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition-all duration-150 ${
                        selectedTable === v.name && !queryMode
                          ? 'bg-[var(--aeres-violet)]/15 text-[var(--aeres-violet)] font-semibold'
                          : 'text-[var(--aeres-muted)] hover:bg-white/5 hover:text-[var(--aeres-text)]'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0 text-blue-400/50" />
                      <span className="truncate">{v.name}</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* DB file badge */}
        <div className="border-t border-[var(--aeres-border)]/20 px-3 py-2 text-[9px] text-[var(--aeres-muted)]/50 truncate" title={filePath}>
          📁 {activeTab?.name}
        </div>
      </div>

      {/* ─── RIGHT: Data Grid ─── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-[var(--aeres-border)]/20 bg-[var(--aeres-surface)]/40 px-3 py-1.5">
          {!queryMode && selectedTable && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <Database className="h-3.5 w-3.5 text-[var(--aeres-violet)]" />
              <span className="font-semibold text-[var(--aeres-text)]">{selectedTable}</span>
              <span className="text-[var(--aeres-muted)]/60">•</span>
              <Rows3 className="h-3 w-3 text-[var(--aeres-muted)]/60" />
              <span className="text-[10px] text-[var(--aeres-muted)]">{total.toLocaleString()} rows</span>
              <span className="text-[var(--aeres-muted)]/60">•</span>
              <Columns3 className="h-3 w-3 text-[var(--aeres-muted)]/60" />
              <span className="text-[10px] text-[var(--aeres-muted)]">{columns.length} columns</span>
            </div>
          )}

          <div className="flex-1" />

          <button
            onClick={() => { setQueryMode(!queryMode); setQueryResult(null); setError(null) }}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all ${
              queryMode
                ? 'bg-[var(--aeres-violet)] text-white shadow-lg shadow-[var(--aeres-violet)]/20'
                : 'bg-white/5 text-[var(--aeres-muted)] hover:bg-[var(--aeres-violet)]/15 hover:text-[var(--aeres-violet)]'
            }`}
          >
            <Play className="h-3 w-3" />
            SQL Query
          </button>

          <button
            onClick={() => { setPage(0); setSelectedTable(selectedTable) /* force re-fetch */ }}
            className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[10px] text-[var(--aeres-muted)] hover:bg-white/10 transition-all"
            title="Refresh"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>

        {/* Query input bar */}
        {queryMode && (
          <div className="flex items-center gap-2 border-b border-[var(--aeres-border)]/20 bg-[var(--aeres-surface)]/30 px-3 py-2">
            <span className="text-[10px] font-bold text-[var(--aeres-violet)] uppercase tracking-wider shrink-0">SQL</span>
            <input
              type="text"
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRunQuery() }}
              placeholder="SELECT * FROM users WHERE id > 10 LIMIT 50"
              className="flex-1 rounded-lg border border-[var(--aeres-border)]/20 bg-black/30 px-3 py-1.5 text-[11px] font-mono text-[var(--aeres-text)] placeholder-[var(--aeres-muted)]/30 outline-none focus:border-[var(--aeres-violet)]/50 transition-colors"
            />
            <button
              onClick={handleRunQuery}
              disabled={tableLoading}
              className="flex items-center gap-1 rounded-lg bg-[var(--aeres-violet)] px-3 py-1.5 text-[10px] font-bold text-white shadow-lg shadow-[var(--aeres-violet)]/20 hover:brightness-110 transition-all disabled:opacity-50"
            >
              {tableLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Run
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Data grid */}
        <div className="flex-1 overflow-auto relative">
          {tableLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--aeres-violet)]" />
            </div>
          )}

          {displayColumns.length > 0 ? (
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 z-[5]">
                <tr className="bg-[var(--aeres-surface)]/90 backdrop-blur-md">
                  <th className="w-10 border-b border-[var(--aeres-border)]/20 px-2 py-2 text-center text-[9px] font-bold text-[var(--aeres-muted)]/50">
                    #
                  </th>
                  {displayColumns.map(col => (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className="cursor-pointer select-none border-b border-[var(--aeres-border)]/20 px-3 py-2 text-left transition-colors hover:bg-[var(--aeres-violet)]/10 group"
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[var(--aeres-text)]">{col.name}</span>
                        {col.pk && (
                          <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold text-amber-400">PK</span>
                        )}
                        {col.type && (
                          <span className="rounded bg-white/5 px-1 py-0.5 text-[8px] font-mono text-[var(--aeres-muted)]/50">{col.type}</span>
                        )}
                        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          {sortCol === col.name ? (
                            sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-[var(--aeres-violet)]" /> : <ArrowDown className="h-3 w-3 text-[var(--aeres-violet)]" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-[var(--aeres-muted)]/40" />
                          )}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-[var(--aeres-border)]/10 transition-colors hover:bg-[var(--aeres-violet)]/5"
                  >
                    <td className="px-2 py-1.5 text-center text-[9px] font-mono text-[var(--aeres-muted)]/40">
                      {queryMode ? ri + 1 : page * PAGE_SIZE + ri + 1}
                    </td>
                    {displayColumns.map(col => {
                      const val = row[col.name]
                      const isNull = val === null || val === undefined
                      return (
                        <td key={col.name} className="px-3 py-1.5 font-mono max-w-xs truncate">
                          {isNull ? (
                            <span className="rounded bg-slate-500/10 px-1.5 py-0.5 text-[9px] italic text-[var(--aeres-muted)]/40">NULL</span>
                          ) : typeof val === 'boolean' ? (
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${val ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                              {String(val)}
                            </span>
                          ) : typeof val === 'number' ? (
                            <span className="text-cyan-300">{val.toLocaleString()}</span>
                          ) : (
                            <span className="text-[var(--aeres-text)]/80" title={String(val)}>
                              {String(val).length > 120 ? String(val).slice(0, 120) + '…' : String(val)}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {displayRows.length === 0 && !tableLoading && (
                  <tr>
                    <td colSpan={displayColumns.length + 1} className="py-12 text-center text-[var(--aeres-muted)]/50 text-xs">
                      {queryMode ? 'Run a query to see results' : 'No data in this table'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : !loading && !tableLoading && !error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--aeres-muted)]/50">
              <Database className="h-12 w-12 opacity-20" />
              <p className="text-sm">Select a table to view its data</p>
            </div>
          ) : null}
        </div>

        {/* Pagination footer */}
        {!queryMode && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--aeres-border)]/20 bg-[var(--aeres-surface)]/40 px-3 py-1.5">
            <span className="text-[10px] text-[var(--aeres-muted)]">
              Showing {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] text-[var(--aeres-muted)] hover:bg-white/10 transition-all disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="px-2 text-[10px] font-mono text-[var(--aeres-muted)]">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] text-[var(--aeres-muted)] hover:bg-white/10 transition-all disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
