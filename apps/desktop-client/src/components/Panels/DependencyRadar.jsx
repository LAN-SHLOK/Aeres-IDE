import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useStore } from '../../store.js'

const STATUS_COLORS = {
  critical: { bg: '#ef4444', label: 'CVE Found', icon: '🔴' },
  abandoned: { bg: '#f59e0b', label: 'Deprecated/Abandoned', icon: '🟡' },
  outdated: { bg: '#3b82f6', label: 'Update Available', icon: '🔵' },
  healthy: { bg: '#22c55e', label: 'Healthy', icon: '🟢' },
  unknown: { bg: '#6b7280', label: 'Unknown', icon: '⚪' },
}

function DepDetailPanel({ dep, onClose, addTerminal, setTerminalPanelOpen }) {
  if (!dep) return null
  const statusInfo = STATUS_COLORS[dep.status] || STATUS_COLORS.unknown
  const [usages, setUsages] = useState([])
  const [searchingUsages, setSearchingUsages] = useState(false)

  useEffect(() => {
    if (!dep || !window.electron || !window.electron.fs) return
    let isMounted = true
    setSearchingUsages(true)
    setUsages([])
    
    window.electron.fs.searchInProject({
      rootPath: useStore.getState().rootPath,
      query: dep.name
    }).then((res) => {
      if (!isMounted) return
      const uniqueFiles = Array.from(new Set((res?.results || []).map(r => r.file)))
      setUsages(uniqueFiles)
      setSearchingUsages(false)
    }).catch(err => {
      console.error('Error finding usages:', err)
      if (isMounted) setSearchingUsages(false)
    })
    
    return () => { isMounted = false }
  }, [dep])

  return (
    <div className="border-t border-slate-800 bg-slate-950/80 overflow-y-auto max-h-[50%] animate-in slide-in-from-bottom-2 duration-200">
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
      {dep.breakingChanges?.length > 0 && (
        <div className="mx-3 mt-2">
          <div className="text-[9px] font-bold text-orange-400 uppercase mb-1 flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Breaking Changes (Auto-Detected)
          </div>
          {dep.breakingChanges.map((bc, i) => (
            <div key={i} className="text-[10px] text-orange-200/80 bg-orange-950/20 p-1.5 mb-1 border border-orange-900/30 rounded">
              {bc}
            </div>
          ))}
        </div>
      )}

      {/* Migration Notes - Auto-fetched from GitHub */}
      {dep.migrationNotes && (
        <div className="mx-3 mt-2">
          <div className="text-[9px] font-bold text-[#7C3AED] uppercase mb-1 flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Release Notes (Auto-Fetched)
          </div>
          <div className="text-[10px] text-slate-300 bg-slate-900/60 p-2 border border-slate-700/30 rounded whitespace-pre-wrap break-words max-h-28 overflow-y-auto font-mono leading-relaxed">
            {dep.migrationNotes}
          </div>
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

      {/* AI Code Migration Usages */}
      {dep.status !== 'healthy' && (
        <div className="mx-3 mt-1 mb-3 p-2 bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-lg">
          <div className="text-[9px] font-bold text-[#A78BFA] uppercase mb-1.5 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            🧠 AI Code Migration Usages
          </div>
          
          {searchingUsages ? (
            <div className="text-[9px] text-slate-500 py-1 italic animate-pulse">Scanning project for package references...</div>
          ) : usages.length === 0 ? (
            <div className="text-[9px] text-slate-500 py-1 italic">No active codebase usages found for '{dep.name}'.</div>
          ) : (
            <div className="space-y-1.5 mt-1">
              <div className="text-[9px] text-slate-400 mb-1">Found in {usages.length} file(s). Select AI actions:</div>
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                {usages.map((file) => {
                  const baseName = file.split(/[\\/]/).pop()
                  return (
                    <div key={file} className="flex justify-between items-center bg-slate-900/50 p-1 rounded border border-slate-800/40 text-[9px]">
                      <span className="text-slate-300 truncate max-w-[65%] font-mono" title={file}>{baseName}</span>
                      <button
                        onClick={() => {
                          useStore.setState({ activeRightTab: 'rag', rightPanelOpen: true })
                          const instruction = `We are upgrading the library '${dep.name}' from ${dep.current} to ${dep.latest} in this project. Please review and refactor the code usages inside the file '${baseName}' to be compatible with ${dep.latest} and resolve any breaking changes:\n\nBreaking changes detailed:\n${dep.breakingChanges?.join('\n') || dep.deprecationMsg || 'N/A'}`
                          
                          if (useStore.getState().installedExtensions.includes('aeres-pro-suite')) {
                            window.dispatchEvent(new CustomEvent('aeres:trigger-agent-migration', {
                              detail: { instruction, filePath: file }
                            }))
                          } else {
                            window.dispatchEvent(new CustomEvent('aeres:rate-limit-hit'))
                          }
                        }}
                        className="px-1.5 py-0.5 bg-[#7C3AED]/20 hover:bg-[#7C3AED]/40 text-[#A78BFA] border border-[#7C3AED]/30 rounded text-[8px] font-bold transition-colors active:scale-95"
                      >
                        ⚡ Migrate File
                      </button>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => {
                  useStore.setState({ activeRightTab: 'rag', rightPanelOpen: true })
                  const instruction = `We are upgrading the library '${dep.name}' from version ${dep.current} to ${dep.latest} in this workspace. Please act as a RAG developer agent, scan our entire project codebase for any and all usages of '${dep.name}', detect deprecated API calls or breaking changes, and modernize our source code files to fully and safely support '${dep.name}@${dep.latest}'.\n\nUpgrade details:\n- Package: ${dep.name}\n- Current: ${dep.current}\n- Target: ${dep.latest}\n- Breaking Changes:\n${dep.breakingChanges?.join('\n') || 'N/A'}\n- Release Notes:\n${dep.migrationNotes || 'N/A'}`
                  
                  if (useStore.getState().installedExtensions.includes('aeres-pro-suite')) {
                    window.dispatchEvent(new CustomEvent('aeres:trigger-agent-migration', {
                      detail: { instruction }
                    }))
                  } else {
                    window.dispatchEvent(new CustomEvent('aeres:rate-limit-hit'))
                  }
                }}
                className="w-full mt-1 py-1 bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#A78BFA] hover:bg-[#7C3AED]/40 text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-colors active:scale-95"
              >
                🧠 Auto-Migrate All Usages (AI Agent)
              </button>
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
              alert('Failed to launch update: ' + err.message)
            }
          }}
          className="w-full py-1.5 bg-[#7C3AED] text-white text-[10px] font-bold rounded border border-[#7C3AED] hover:bg-[#7C3AED]/80 transition-colors flex items-center justify-center gap-1 shadow-md shadow-[#7C3AED]/20 active:scale-[0.98]"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          ⚡ Install Update (Run in Terminal)
        </button>
        <button
          onClick={() => {
            const cmd = dep.ecosystem === 'npm' ? `npm install ${dep.name}@latest` : `pip install ${dep.name} --upgrade`
            navigator.clipboard.writeText(cmd)
            alert('Terminal update command copied to clipboard!')
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
                  {dep.breakingChanges?.length > 0 && <span className="text-[8px] text-orange-500">⚡</span>}
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
  const [scanError, setScanError] = useState(null)
  const svgRef = useRef(null)

  const scan = async () => {
    if (!rootPath) return
    setLoading(true)
    setSelectedDep(null)
    setScanError(null)
    try {
      const res = await window.electron.radar.scan({ rootPath })
      if (res?.error) {
        setScanError(res.error)
      } else {
        setData(res)
      }
    } catch (err) {
      console.error('[DependencyRadar] scan error:', err)
      setScanError(err.message || 'Failed to scan ecosystem dependencies')
    }
    setLoading(false)
  }

  useEffect(() => { scan() }, [rootPath])

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
              {scanError}
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {data && (
        <div className="flex items-center gap-0 border-b border-slate-800/30 text-[9px]">
          <div className="flex-1 flex items-center gap-1 px-2 py-1 border-r border-slate-800/30">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-slate-400">{counts.critical} CVE</span>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2 py-1 border-r border-slate-800/30">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-slate-400">{counts.abandoned} Dep</span>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2 py-1 border-r border-slate-800/30">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /><span className="text-slate-400">{counts.outdated} Out</span>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" /><span className="text-slate-400">{counts.healthy} OK</span>
          </div>
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
        <ListView deps={allDeps} onSelect={setSelectedDep} selectedDep={selectedDep} />
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
