import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useStore } from '../../store.js'

export default function DependencyRadar() {
  const rootPath = useStore((s) => s.rootPath)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const svgRef = useRef(null)

  async function handleScan() {
    if (!rootPath || !window.electron) return
    setLoading(true)
    try {
      const token = await window.electron.auth.getToken()
      const resp = await fetch(`${useStore.getState().backendUrl}/api/deps/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ root_path: rootPath })
      })
      const json = await resp.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (rootPath) handleScan()
  }, [rootPath])

  useEffect(() => {
    if (!data || !svgRef.current) return

    const width = 400
    const height = 300
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Flatten data for treemap
    const all = [...(data.npm || []), ...(data.pypi || [])]
    if (all.length === 0) {
      const svg = d3.select(svgRef.current)
      svg.selectAll('*').remove()
      svg.append('text')
        .attr('x', 200)
        .attr('y', 150)
        .attr('text-anchor', 'middle')
        .attr('fill', '#71717a')
        .attr('font-size', '12px')
        .text('No Node/Python dependencies detected.')
      return
    }

    const hierarchy = d3.hierarchy({ children: all })
      .sum(d => d.bundleKb || 10) // Size by bundle or constant
      .sort((a, b) => b.value - a.value)

    const treemap = d3.treemap()
      .size([width, height])
      .padding(1)
      (hierarchy)

    const cell = svg.selectAll('g')
      .data(treemap.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .on('click', (e, d) => setSelected(d.data))
      .style('cursor', 'pointer')

    cell.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => {
        if (d.data.status === 'critical') return '#E24B4A'
        if (d.data.status === 'abandoned') return '#E24B4A'
        if (d.data.status === 'outdated') return '#BA7517'
        if (d.data.status === 'healthy') return '#1D9E75'
        return '#444'
      })
      .attr('rx', 2)

    cell.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(d => (d.x1 - d.x0 > 40) ? d.data.name : '')

  }, [data])

  if (!rootPath) return (
    <div className="p-8 text-center text-aether-muted text-sm">Open a folder to see dependency health.</div>
  )

  return (
    <div className="flex flex-col h-full bg-aether-bg">
      <div className="p-3 border-b border-aether-border flex justify-between items-center">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dependency Radar</h3>
        <button onClick={handleScan} className="p-1 hover:text-white transition-colors text-aether-muted">
          <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="p-1">
        <svg ref={svgRef} className="w-full rounded overflow-hidden" style={{ height: 300 }} />
      </div>

      <div className="flex-1 overflow-y-auto border-t border-aether-border">
        {selected ? (
          <div className="p-4 space-y-3 bg-aether-surface/40">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold text-white mb-1">{selected.name}</h4>
              <button onClick={() => setSelected(null)} className="text-aether-muted hover:text-white">&times;</button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-aether-bg/60 border border-aether-border">
                <span className="text-[9px] uppercase text-aether-muted block">Current</span>
                <span className="text-xs font-mono">{selected.current}</span>
              </div>
              <div className="p-2 rounded bg-aether-bg/60 border border-aether-border">
                <span className="text-[9px] uppercase text-aether-muted block">Latest</span>
                <span className="text-xs font-mono text-aether-violet">{selected.latest}</span>
              </div>
            </div>

            {selected.cves?.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-aether-red font-bold">Vulnerabilities Found:</span>
                {selected.cves.map(v => (
                  <div key={v.id} className="text-[10px] p-1.5 rounded bg-aether-red/10 border border-aether-red/20 text-aether-red">
                    <b>{v.id}</b>: {v.summary}
                  </div>
                ))}
              </div>
            )}

            {selected.bundleKb && (
              <div className="flex items-center gap-2 text-xs text-aether-text/80">
                <svg className="w-3 h-3 text-aether-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>{selected.bundleKb} KB (gzipped)</span>
              </div>
            )}
            
            {selected.isAbandoned && (
                <div className="text-[10px] p-1.5 rounded bg-aether-amber/10 border border-aether-amber/20 text-aether-amber">
                    ⚠️ Abandoned: No activity for 2+ years.
                </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-aether-muted text-xs">
            Select a package to see detailed health and vulnerability metrics.
          </div>
        )}
      </div>
    </div>
  )
}
