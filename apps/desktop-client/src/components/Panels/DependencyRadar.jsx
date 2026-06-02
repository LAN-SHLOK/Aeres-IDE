import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { AlertOctagon, AlertTriangle, PackageSearch, CheckCircle2, HelpCircle, Brain, Zap, Terminal } from 'lucide-react'
import { useStore } from '../../store.js'

const STATUS_COLORS = {
  critical: { bg: '#ef4444', label: 'CVE Found', icon: <AlertOctagon size={10} /> },
  abandoned: { bg: '#f59e0b', label: 'Deprecated/Abandoned', icon: <AlertTriangle size={10} /> },
  outdated: { bg: '#3b82f6', label: 'Update Available', icon: <PackageSearch size={10} /> },
  healthy: { bg: '#22c55e', label: 'Healthy', icon: <CheckCircle2 size={10} /> },
  unknown: { bg: '#6b7280', label: 'Unknown', icon: <HelpCircle size={10} /> },
}

function DepDetailPanel({ dep, onClose, addTerminal, setTerminalPanelOpen }) {
  if (!dep) return null
  const statusInfo = STATUS_COLORS[dep.status] || STATUS_COLORS.unknown
  const [usages, setUsages] = useState([])
  const [searchingUsages, setSearchingUsages] = useState(false)
  const [migrationNotes, setMigrationNotes] = useState('')
  const [breakingChanges, setBreakingChanges] = useState([])
  const [fetchingNotes, setFetchingNotes] = useState(false)

  const handleOpenFile = async (fileMatch) => {
    try {
      const content = await window.electron.fs.readFile(fileMatch.file)
      useStore.getState().openTab({
        path: fileMatch.file,
        name: fileMatch.file.split(/[\\/]/).pop(),
        content: content,
        line: fileMatch.lines[0],
        highlightLines: fileMatch.lines
      })
      useStore.getState().setActiveSidebarTab('files')
    } catch (err) {
      console.error('Failed to open file:', err)
    }
  }

  useEffect(() => {
    if (!dep || !window.electron || !window.electron.radar || dep.status === 'healthy') return
    
    // Reset state
    setMigrationNotes('')
    setBreakingChanges([])
    
    if (!dep.repoUrl || !dep.repoUrl.includes('github.com')) return

    let isMounted = true
    setFetchingNotes(true)
    
    const cacheKey = `${dep.name}@${dep.current}`
    if (window._radarNotesCache && window._radarNotesCache[cacheKey]) {
      const cached = window._radarNotesCache[cacheKey]
      setMigrationNotes(cached.migrationNotes || '')
      setBreakingChanges(cached.breakingChanges || [])
      setFetchingNotes(false)
      return
    }
    
    window.electron.radar.getNotes({
      repo_url: dep.repoUrl,
      current: dep.current,
      latest: dep.latest,
      name: dep.name,
      ecosystem: dep.ecosystem
    }).then((res) => {
      if (!isMounted) return
      if (res && !res.error) {
        if (!window._radarNotesCache) window._radarNotesCache = {}
        window._radarNotesCache[cacheKey] = {
          migrationNotes: res.migrationNotes,
          breakingChanges: res.breakingChanges
        }
        setMigrationNotes(res.migrationNotes || '')
        setBreakingChanges(res.breakingChanges || [])
      }
      setFetchingNotes(false)
    }).catch(err => {
      console.error('Error fetching notes:', err)
      if (isMounted) setFetchingNotes(false)
    })
    
    return () => { isMounted = false }
  }, [dep])

  useEffect(() => {
    if (!dep || !window.electron || !window.electron.fs) return
    let isMounted = true
    setSearchingUsages(true)
    setUsages([])
    
    const cacheKey = dep.name
    if (window._radarUsagesCache && window._radarUsagesCache[cacheKey]) {
      setUsages(window._radarUsagesCache[cacheKey])
      setSearchingUsages(false)
      return
    }
    
    window.electron.fs.searchInProject({
      rootPath: useStore.getState().rootPath,
      query: dep.name
    }).then((res) => {
      if (!isMounted) return
      const grouped = {}
      ;(res?.results || []).forEach(r => {
        if (!grouped[r.file]) grouped[r.file] = []
        // Avoid duplicate lines if multiple matches on same line
        if (!grouped[r.file].includes(r.line)) grouped[r.file].push(r.line)
      })
      const groupedArray = Object.keys(grouped).map(f => ({ file: f, lines: grouped[f] }))
      // Sort by number of usages
      groupedArray.sort((a, b) => b.lines.length - a.lines.length)
      
      if (!window._radarUsagesCache) window._radarUsagesCache = {}
      window._radarUsagesCache[cacheKey] = groupedArray
      
      setUsages(groupedArray)
      setSearchingUsages(false)
    }).catch(err => {
      console.error('Error finding usages:', err)
      if (isMounted) setSearchingUsages(false)
    })
    
    return () => { isMounted = false }
  }, [dep])

  return (
    <div className="border-t border-slate-800 bg-slate-950/95 overflow-y-auto max-h-[75%] animate-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex justify-between items-start p-3 border-b border-slate-800/50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px]">{statusInfo.icon}</span>
            <h4 className="text-xs font-bold text-white truncate">{dep.name}</h4>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              dep.status === 'critical' ? 'bg-red-500/20 text-red-400' :
              dep.status === 'abandoned' ? 'bg-amber-500/20 text-amber-400' :
              dep.status === 'outdated' ? 'bg-blue-500/20 text-blue-400' :
              'bg-green-500/20 text-green-400'
            }`}>{statusInfo.label}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{dep.ecosystem?.toUpperCase()} • {dep.current} → {dep.latest}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Summary */}
      {dep.summary && (
        <div className="px-3 py-2 border-b border-slate-800/30">
          <p className="text-[10px] text-slate-400 italic">{dep.summary}</p>
        </div>
      )}

      {/* Deprecation Warning */}
      {dep.deprecated && dep.deprecationMsg && (
        <div className="mx-3 mt-2 p-2 bg-amber-950/30 border border-amber-500/20 rounded">
          <div className="text-[9px] font-bold text-amber-400 uppercase mb-1 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Deprecated
          </div>
          <p className="text-[10px] text-amber-200/80">{dep.deprecationMsg}</p>
        </div>
      )}

      {/* CVEs */}
      {dep.cves?.length > 0 && (
        <div className="mx-3 mt-2">
          <div className="text-[9px] font-bold text-red-400 uppercase mb-1">Vulnerabilities</div>
          {dep.cves.map(c => (
            <div key={c.id} className="text-[10px] text-red-200/80 bg-red-900/20 p-1.5 mb-1 border border-red-900/30 rounded">
              <b>{c.id}</b>: {c.summary}
            </div>
          ))}
        </div>
      )}

      {/* Breaking Changes - Auto-fetched */}
      {(fetchingNotes || breakingChanges.length > 0) && (
        <div className="mx-3 mt-2">
          <div className="text-[9px] font-bold text-orange-400 uppercase mb-1 flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Breaking Changes (Auto-Detected)
          </div>
          {fetchingNotes ? (
            <div className="text-[9px] text-slate-500 italic py-1 animate-pulse">Scanning GitHub releases for breaking changes...</div>
          ) : (
            breakingChanges.map((bc, i) => (
              <div key={i} className="text-[10px] text-orange-200/80 bg-orange-950/20 p-1.5 mb-1 border border-orange-900/30 rounded">
                {bc}
              </div>
            ))
          )}
        </div>
      )}

      {/* Migration Notes - Auto-fetched from GitHub */}
      {(fetchingNotes || migrationNotes) && (
        <div className="mx-3 mt-2">
          <div className="text-[9px] font-bold text-[#7C3AED] uppercase mb-1 flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Release Notes (Auto-Fetched)
          </div>
          {fetchingNotes ? (
            <div className="text-[9px] text-slate-500 italic py-1 animate-pulse">Fetching latest migration guides...</div>
          ) : (
            <div className="text-[10px] text-slate-300 bg-slate-900/60 p-2 border border-slate-700/30 rounded whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono leading-relaxed">
              {migrationNotes}
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-1.5 mx-3 mt-2">
        <div className="p-1.5 bg-slate-900/40 rounded border border-slate-800/50">
          <div className="text-[8px] text-slate-600 uppercase">License</div>
          <div className="text-[10px] text-slate-300 font-bold truncate">{dep.license || 'Unknown'}</div>
        </div>
        <div className="p-1.5 bg-slate-900/40 rounded border border-slate-800/50">
          <div className="text-[8px] text-slate-600 uppercase">Bundle</div>
          <div className="text-[10px] text-slate-300 font-bold">{dep.bundleKb ? `${dep.bundleKb} KB` : 'N/A'}</div>
        </div>
        <div className="p-1.5 bg-slate-900/40 rounded border border-slate-800/50">
          <div className="text-[8px] text-slate-600 uppercase">Last Publish</div>
          <div className="text-[10px] text-slate-300 font-bold">
            {dep.daysSincePublish ? `${dep.daysSincePublish}d ago` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Links - Auto-resolved */}
      <div className="flex flex-wrap gap-1.5 mx-3 mt-2 mb-3">
        {dep.changelogUrl && (
          <a href={dep.changelogUrl} target="_blank" rel="noopener"
            className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 border border-slate-700/40 rounded text-[9px] text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Changelog
          </a>
        )}
        {dep.repoUrl && (
          <a href={dep.repoUrl} target="_blank" rel="noopener"
            className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 border border-slate-700/40 rounded text-[9px] text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            Repository
          </a>
        )}
        {dep.docsUrl && (
          <a href={dep.docsUrl} target="_blank" rel="noopener"
            className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 border border-slate-700/40 rounded text-[9px] text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Docs
          </a>
        )}
        {dep.homepage && !dep.homepage.includes('github.com') && (
          <a href={dep.homepage} target="_blank" rel="noopener"
            className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 border border-slate-700/40 rounded text-[9px] text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
            Homepage
          </a>
        )}
      </div>

      {/* Codebase Usages */}
      {dep.status !== 'healthy' && (
        <div className="mx-3 mt-1 mb-3 p-2 bg-slate-900/50 border border-slate-700/50 rounded-lg">
          <div className="text-[9px] font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Codebase Usages
          </div>
          
          {searchingUsages ? (
            <div className="text-[9px] text-slate-500 py-1 italic animate-pulse">Scanning project for package references...</div>
          ) : usages.length === 0 ? (
            <div className="text-[9px] text-slate-500 py-1 italic">No active codebase usages found for '{dep.name}'.</div>
          ) : (
            <div className="space-y-1.5 mt-1">
              <div className="text-[9px] text-slate-400 mb-1">Found in {usages.length} file(s):</div>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                {usages.map((u) => {
                  const baseName = u.file.split(/[\\/]/).pop()
                  return (
                    <div 
                      key={u.file} 
                      onClick={() => handleOpenFile(u)}
                      className="group flex justify-between items-center bg-slate-950/50 p-1.5 rounded border border-slate-800/60 text-[9px] hover:bg-slate-800/60 hover:border-slate-600/60 cursor-pointer transition-colors"
                    >
                      <span className="text-slate-300 truncate font-mono flex-1 group-hover:text-white" title={u.file}>{baseName}</span>
                      <span className="text-slate-500 font-mono ml-2 text-[8px] bg-slate-900 px-1 rounded border border-slate-800 flex-shrink-0 group-hover:bg-slate-800 group-hover:border-slate-600 group-hover:text-slate-300">
                        Line: {u.lines.slice(0, 3).join(', ')}{u.lines.length > 3 ? ', ...' : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}



      {/* Update Buttons */}
      <div className="px-3 pb-3 flex flex-col gap-1.5">
        <button
          onClick={async () => {
            if (!window.electron) return
            const cmd = dep.ecosystem === 'npm' ? `npm install ${dep.name}@latest` : `pip install ${dep.name} --upgrade`
            try {
              const { id } = await window.electron.terminal.create({ cwd: useStore.getState().rootPath || undefined })
              addTerminal({ id, name: `Update: ${dep.name}` })
              setTerminalPanelOpen(true)
              useStore.setState({ activeTerminalId: id })
              setTimeout(() => {
                window.electron.terminal.write(id, `${cmd}\r`)
              }, 600)
            } catch (err) {
              const store = useStore.getState();
              store.appendOutputLog('error', 'Failed to launch update: ' + err.message);
              store.setActiveSidebarTab('output');
            }
          }}
          className="w-full py-1.5 bg-[#7C3AED] text-white text-[10px] font-bold rounded border border-[#7C3AED] hover:bg-[#7C3AED]/80 transition-colors flex items-center justify-center gap-1 shadow-md shadow-[#7C3AED]/20 active:scale-[0.98]"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <Terminal size={10} /> Install Update (Run in Terminal)
        </button>
        <button
          onClick={() => {
            const cmd = dep.ecosystem === 'npm' ? `npm install ${dep.name}@latest` : `pip install ${dep.name} --upgrade`
            navigator.clipboard.writeText(cmd)
            const store = useStore.getState();
            store.appendOutputLog('success', 'Terminal update command copied to clipboard!');
            store.setActiveSidebarTab('output');
          }}
          className="w-full py-1 bg-slate-800 text-slate-300 text-[9px] font-bold rounded border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
        >
          Copy Terminal Command
        </button>
      </div>
    </div>
  )
}

function ListView({ deps, onSelect, selectedDep }) {
  const grouped = {
    critical: deps.filter(d => d.status === 'critical'),
    abandoned: deps.filter(d => d.status === 'abandoned'),
    outdated: deps.filter(d => d.status === 'outdated'),
    healthy: deps.filter(d => d.status === 'healthy'),
    unknown: deps.filter(d => d.status === 'unknown'),
  }

  return (
    <div className="overflow-y-auto flex-1">
      {Object.entries(grouped).map(([status, items]) => {
        if (items.length === 0) return null
        const info = STATUS_COLORS[status]
        return (
          <div key={status}>
            <div className="sticky top-0 px-3 py-1 bg-slate-950/90 backdrop-blur text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/30 flex items-center gap-1.5">
              <span>{info.icon}</span>
              <span>{info.label}</span>
              <span className="ml-auto text-slate-600">{items.length}</span>
            </div>
            {items.map(dep => (
              <button
                key={`${dep.ecosystem}-${dep.name}`}
                onClick={() => onSelect(dep)}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800/40 transition-colors border-b border-slate-800/20 ${
                  selectedDep?.name === dep.name ? 'bg-slate-800/60' : ''
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: info.bg }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-300 font-medium truncate">{dep.name}</div>
                  <div className="text-[9px] text-slate-600">{dep.current} → {dep.latest}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {dep.deprecated && <span className="text-[8px] text-amber-500">DEP</span>}
                  {dep.breakingChanges?.length > 0 && <span className="text-[8px] text-orange-500"><Zap size={8} /></span>}
                  {dep.cves?.length > 0 && <span className="text-[8px] text-red-500">{dep.cves.length} CVE</span>}
                  <span className="text-[9px] text-slate-600">{dep.ecosystem}</span>
                </div>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function DependencyRadar() {
  const rootPath = useStore((s) => s.rootPath)
  const addTerminal = useStore((s) => s.addTerminal)
  const setTerminalPanelOpen = useStore((s) => s.setTerminalPanelOpen)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedDep, setSelectedDep] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'treemap'
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'critical' | 'abandoned' | 'outdated' | 'healthy'
  const [scanError, setScanError] = useState(null)
  const svgRef = useRef(null)

  const scan = async (force = false) => {
    if (!rootPath) return
    
    if (!force && window._radarMainCache && window._radarMainCache.rootPath === rootPath) {
      setData(window._radarMainCache.data)
      return
    }

    setLoading(true)
    if (force) {
        // preserve selected dep if possible, otherwise null
    } else {
        setSelectedDep(null)
    }
    setScanError(null)
    try {
      const res = await window.electron.radar.scan({ root_path: rootPath })
      if (res?.error) {
        setScanError(res.error)
      } else {
        window._radarMainCache = { rootPath, data: res }
        setData(res)
      }
    } catch (err) {
      console.error('[DependencyRadar] scan error:', err)
      setScanError(err.message || 'Failed to scan ecosystem dependencies')
    }
    setLoading(false)
  }

  useEffect(() => { scan() }, [rootPath])

  // Automatically refresh when file structure changes (e.g. package.json edit)
  useEffect(() => {
    if (!window.electron || !window.electron.fs) return
    const cleanup = window.electron.fs.onChanged(() => {
      window._radarMainCache = null
      window._radarUsagesCache = null
      scan(true) // force refresh
    })
    return cleanup
  }, [rootPath])

  // Treemap rendering
  useEffect(() => {
    if (!data || !svgRef.current || viewMode !== 'treemap') return

    const allDeps = [...(data.npm || []), ...(data.pypi || [])]
    if (allDeps.length === 0) return

    const width = 300
    const height = 400
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // 1. Create a container group for zoom and panning
    const svgGroup = svg.append('g')

    // 2. Set up the zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        svgGroup.attr('transform', event.transform)
      })

    svg.call(zoom)
    svg.call(zoom.transform, d3.zoomIdentity)

    const hierarchy = d3.hierarchy({ children: allDeps })
      .sum(d => d.bundleKb || 10)
      .sort((a, b) => b.value - a.value)

    const treemap = d3.treemap().size([width, height]).padding(1).round(true)
    treemap(hierarchy)

    // 3. Append to svgGroup instead of svg!
    const cell = svgGroup.selectAll('g')
      .data(hierarchy.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .on('click', (event, d) => setSelectedDep(d.data))
      .style('cursor', 'pointer')

    cell.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => (STATUS_COLORS[d.data.status] || STATUS_COLORS.unknown).bg)
      .attr('opacity', 0.8)
      .attr('rx', 2)

    cell.append('text')
      .selectAll('tspan')
      .data(d => (d.x1 - d.x0 > 40 && d.y1 - d.y0 > 20) ? [d.data.name] : [])
      .join('tspan')
      .attr('x', 4).attr('y', 13)
      .text(d => d)
      .attr('font-size', '9px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
  }, [data, viewMode])

  const allDeps = data ? [...(data.npm || []), ...(data.pypi || [])] : []
  const counts = {
    critical: allDeps.filter(d => d.status === 'critical').length,
    outdated: allDeps.filter(d => d.status === 'outdated').length,
    abandoned: allDeps.filter(d => d.status === 'abandoned').length,
    healthy: allDeps.filter(d => d.status === 'healthy').length,
  }

  return (
    <div className="flex flex-col h-full bg-slate-950/40 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800/50 flex justify-between items-center">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dependency Radar</h3>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-900/60 rounded border border-slate-700/40 overflow-hidden">
            <button onClick={() => setViewMode('list')}
              className={`px-1.5 py-0.5 text-[8px] font-bold transition ${viewMode === 'list' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-slate-500 hover:text-slate-300'}`}
            >LIST</button>
            <button onClick={() => setViewMode('treemap')}
              className={`px-1.5 py-0.5 text-[8px] font-bold transition ${viewMode === 'treemap' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-slate-500 hover:text-slate-300'}`}
            >MAP</button>
          </div>
          <button onClick={scan} disabled={loading} className="text-slate-500 hover:text-white transition-colors disabled:opacity-30">
            <svg className={loading ? 'animate-spin' : ''} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
      </div>

      {scanError && (
        <div className="mx-2 my-2 p-3 rounded-lg border border-orange-800/40 bg-orange-950/20 text-orange-400 text-[11px] leading-relaxed">
          <div className="flex gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <span className="font-bold block mb-0.5">Scan Failed</span>
              {typeof scanError === 'object' ? JSON.stringify(scanError) : scanError}
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {data && (
        <div className="flex items-center gap-0 border-b border-slate-800/30 text-[9px]">
          <button 
            onClick={() => setFilterStatus(filterStatus === 'critical' ? 'all' : 'critical')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border-r border-slate-800/30 transition-colors ${filterStatus === 'critical' ? 'bg-red-900/40 border-b-2 border-b-red-500' : 'hover:bg-slate-900/40 border-b-2 border-b-transparent'}`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_#ef4444]" /><span className={`font-bold ${filterStatus === 'critical' ? 'text-red-400' : 'text-slate-400'}`}>{counts.critical} CVE</span>
          </button>
          <button 
            onClick={() => setFilterStatus(filterStatus === 'abandoned' ? 'all' : 'abandoned')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border-r border-slate-800/30 transition-colors ${filterStatus === 'abandoned' ? 'bg-amber-900/40 border-b-2 border-b-amber-500' : 'hover:bg-slate-900/40 border-b-2 border-b-transparent'}`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_#f59e0b]" /><span className={`font-bold ${filterStatus === 'abandoned' ? 'text-amber-400' : 'text-slate-400'}`}>{counts.abandoned} Dep</span>
          </button>
          <button 
            onClick={() => setFilterStatus(filterStatus === 'outdated' ? 'all' : 'outdated')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border-r border-slate-800/30 transition-colors ${filterStatus === 'outdated' ? 'bg-blue-900/40 border-b-2 border-b-blue-500' : 'hover:bg-slate-900/40 border-b-2 border-b-transparent'}`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_#3b82f6]" /><span className={`font-bold ${filterStatus === 'outdated' ? 'text-blue-400' : 'text-slate-400'}`}>{counts.outdated} Out</span>
          </button>
          <button 
            onClick={() => setFilterStatus(filterStatus === 'healthy' ? 'all' : 'healthy')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 transition-colors ${filterStatus === 'healthy' ? 'bg-green-900/40 border-b-2 border-b-green-500' : 'hover:bg-slate-900/40 border-b-2 border-b-transparent'}`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_#22c55e]" /><span className={`font-bold ${filterStatus === 'healthy' ? 'text-green-400' : 'text-slate-400'}`}>{counts.healthy} OK</span>
          </button>
        </div>
      )}

      {/* Main content */}
      {data && allDeps.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs bg-slate-950/40">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-20 text-[#7C3AED]">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <p className="font-bold text-slate-400 mb-1">No framework dependencies detected</p>
          <p className="text-[10px] text-slate-500">This feature scans package.json (NPM) or requirements.txt (Python) configurations.</p>
        </div>
      ) : viewMode === 'list' ? (
        <ListView deps={filterStatus === 'all' ? allDeps : allDeps.filter(d => d.status === filterStatus)} onSelect={setSelectedDep} selectedDep={selectedDep} />
      ) : (
        <div className="flex-1 overflow-hidden p-2 relative">
          <svg ref={svgRef} className="w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet" />
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-white font-bold">Scanning Ecosystems...</p>
          <p className="text-[10px] text-slate-400 mt-1">Auto-fetching deprecation notices & release notes</p>
          <p className="text-[10px] text-slate-500 mt-0.5 italic">Checking OSV.dev, NPM, PyPI, GitHub Releases</p>
        </div>
      )}

      {/* Detail panel */}
      <DepDetailPanel 
        dep={selectedDep} 
        onClose={() => setSelectedDep(null)} 
        addTerminal={addTerminal}
        setTerminalPanelOpen={setTerminalPanelOpen}
      />

      {/* Footer */}
      <div className="px-3 py-1.5 text-[9px] text-slate-600 bg-slate-950/60 border-t border-slate-800/30 flex items-center gap-1">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        Deprecation & migration data auto-fetched from GitHub Releases
      </div>
    </div>
  )
}
