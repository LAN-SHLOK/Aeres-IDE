import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useStore } from '../../store.js'

// Language-specific color palette
const EXT_COLORS = {
  js: '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#3178c6',
  css: '#1572b6', html: '#e34f26', json: '#fbbf24', md: '#0086d4',
  py: '#3776ab', go: '#00add8', rs: '#dea584', java: '#b07219',
  c: '#555555', cpp: '#f34b7d', h: '#555555',
  png: '#22c55e', jpg: '#22c55e', svg: '#22c55e', gif: '#22c55e',
  lock: '#6b7280', yml: '#cb171e', yaml: '#cb171e', toml: '#9c4121',
  sh: '#89e051', bat: '#c1f12e', env: '#ecd53f',
}

function getColor(name, depth) {
  if (!name) return '#7C3AED'
  const ext = name.split('.').pop()?.toLowerCase()
  return EXT_COLORS[ext] || (depth <= 1 ? '#7C3AED' : '#4a4a6a')
}

export default function WorkspaceSunburst() {
  const fileTree = useStore((s) => s.fileTree)
  const rootPath = useStore((s) => s.rootPath)
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  const [hoveredNode, setHoveredNode] = useState(null)
  const [dimensions, setDimensions] = useState({ width: 700, height: 700 })

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      const size = Math.min(width, height)
      setDimensions({ width: size, height: size })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Calculate stats
  const stats = useMemo(() => {
    if (!fileTree || fileTree.length === 0) return { files: 0, dirs: 0, totalSize: 0, languages: 0 }
    let files = 0, dirs = 0, totalSize = 0
    const langs = new Set()

    function walk(nodes) {
      if (!Array.isArray(nodes)) return
      nodes.forEach(n => {
        if (n.type === 'dir') { dirs++; if (n.children) walk(n.children) }
        else { files++; totalSize += n.size || 0; const ext = n.name.split('.').pop()?.toLowerCase(); if (ext) langs.add(ext) }
      })
    }
    walk(fileTree)
    return { files, dirs, totalSize, languages: langs.size }
  }, [fileTree])

  useEffect(() => {
    if (!fileTree || fileTree.length === 0 || !svgRef.current) return

    const width = dimensions.width
    const height = dimensions.height
    const radius = Math.min(width, height) / 2

    // Prepare data structure
    const data = {
      name: rootPath ? rootPath.split(/[/\\]/).pop() : "Root",
      children: fileTree
    }

    // Compute layout
    const hierarchy = d3.hierarchy(data)
      .sum(d => d.size || (d.type === 'dir' ? 0 : 400))
      .sort((a, b) => b.value - a.value)

    const partition = d3.partition()
      .size([2 * Math.PI, radius])

    const root = partition(hierarchy)

    // Arc generator
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => Math.max(d.y0, d.y1 - 1.5))

    // Setup SVG
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const defs = svg.append('defs')

    // Radial gradient for center
    const radGrad = defs.append('radialGradient').attr('id', 'center-glow')
    radGrad.append('stop').attr('offset', '0%').attr('stop-color', '#7C3AED').attr('stop-opacity', 0.4)
    radGrad.append('stop').attr('offset', '100%').attr('stop-color', '#7C3AED').attr('stop-opacity', 0)

    const svgGroup = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    // Center glow
    svgGroup.append('circle').attr('r', radius * 0.12).attr('fill', 'url(#center-glow)')

    // Draw paths
    svgGroup.append('g')
      .selectAll('path')
      .data(root.descendants().filter(d => d.depth))
      .join('path')
      .attr('fill', d => {
        if (d.data.type === 'dir') {
          // Make dirs darker at deeper levels
          const opacity = Math.max(0.15, 0.5 - d.depth * 0.08)
          return `rgba(124, 58, 237, ${opacity})`
        }
        return getColor(d.data.name, d.depth)
      })
      .attr('fill-opacity', d => d.children ? 0.5 : 0.85)
      .attr('stroke', '#0e1015')
      .attr('stroke-width', 0.5)
      .attr('d', arc)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 1)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
        const sizeKB = (d.value / 1024).toFixed(1)
        setHoveredNode({
          name: d.data.name,
          path: d.data.path || '',
          sizeKB,
          type: d.data.type || 'file',
          childrenCount: d.children ? d.children.length : 0,
          depth: d.depth
        })
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', d.children ? 0.5 : 0.85)
          .attr('stroke', '#0e1015')
          .attr('stroke-width', 0.5)
        setHoveredNode(null)
      })

    // Labels for arcs wide enough
    svgGroup.append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants().filter(d => d.depth && (d.x1 - d.x0) > 0.05 && ((d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 25)))
      .join('text')
      .attr('transform', function(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI
        const y = (d.y0 + d.y1) / 2
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`
      })
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', d => Math.max(7, Math.min(11, (d.y1 - d.y0) / 5)) + 'px')
      .attr('font-weight', '700')
      .attr('filter', 'drop-shadow(0 0 2px rgba(0,0,0,0.8))')
      .text(d => {
        const maxLen = Math.floor((d.y1 - d.y0) / 5)
        return d.data.name.length > maxLen ? d.data.name.slice(0, maxLen - 1) + '…' : d.data.name
      })

    // Center label
    svgGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', '900')
      .attr('letter-spacing', '0.05em')
      .text((rootPath || '').split(/[/\\]/).pop()?.toUpperCase() || 'ROOT')

    svgGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.1em')
      .attr('fill', '#7C3AED')
      .attr('font-size', '8px')
      .attr('font-weight', '600')
      .text(`${stats.files} files · ${stats.dirs} dirs`)

  }, [fileTree, rootPath, dimensions, stats])

  if (!fileTree || fileTree.length === 0) {
    return (
      <div className="flex w-full h-full justify-center items-center text-slate-500 font-mono text-sm bg-slate-950/40 flex-col gap-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-aeres-violet opacity-30">
          <circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9" strokeDasharray="4 4" />
        </svg>
        <span>Open a workspace folder to visualize its structure.</span>
      </div>
    )
  }

  return (
    <div className="flex w-full h-full bg-[#0a0a12] overflow-hidden relative">
      {/* Left Info Panel */}
      <div className="w-[260px] shrink-0 border-r border-slate-800/50 bg-[#0e0e1a] p-4 flex flex-col gap-4 overflow-y-auto">
        
        <div>
          <h2 className="text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#7C3AED]">
              <circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9" strokeDasharray="4 4" />
            </svg>
            Sunburst Matrix
          </h2>
          <p className="text-slate-500 text-[10px] mt-1 leading-relaxed">Recursive file architecture & size distribution.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl p-2.5">
            <div className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Files</div>
            <div className="text-lg font-black text-white">{stats.files}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl p-2.5">
            <div className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Directories</div>
            <div className="text-lg font-black text-white">{stats.dirs}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl p-2.5">
            <div className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Total Size</div>
            <div className="text-lg font-black text-white">
              {stats.totalSize > 1048576 ? (stats.totalSize / 1048576).toFixed(1) + ' MB' : (stats.totalSize / 1024).toFixed(0) + ' KB'}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl p-2.5">
            <div className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Languages</div>
            <div className="text-lg font-black text-white">{stats.languages}</div>
          </div>
        </div>

        {/* Active Node Telemetry */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/40 backdrop-blur-md">
          <div className="text-[9px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Active Node Telemetry</div>
          {hoveredNode ? (
            <div className="animate-in fade-in duration-100">
              <div className="text-sm font-black text-white truncate" title={hoveredNode.path}>{hoveredNode.name}</div>
              <div className="text-[10px] text-[#7C3AED] font-mono mt-0.5 truncate opacity-70">{hoveredNode.path}</div>
              
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-[#0a0a12] p-2 rounded-lg">
                  <div className="text-[8px] text-slate-500 uppercase">Size</div>
                  <div className="text-[11px] text-white font-bold">{hoveredNode.sizeKB} KB</div>
                </div>
                <div className="bg-[#0a0a12] p-2 rounded-lg">
                  <div className="text-[8px] text-slate-500 uppercase">Type</div>
                  <div className="text-[11px] text-white font-bold">{hoveredNode.type === 'dir' ? '📁 DIR' : '📄 FILE'}</div>
                </div>
              </div>
              
              {hoveredNode.type === 'dir' && (
                <div className="mt-2 text-[10px] text-slate-400">Contains <span className="text-white font-bold">{hoveredNode.childrenCount}</span> child nodes · depth {hoveredNode.depth}</div>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-slate-600 italic py-4 text-center">Hover over any ring arc to inspect.</div>
          )}
        </div>

        {/* Color Legend */}
        <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/30">
          <div className="text-[8px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Language Color Key</div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { ext: 'JS/JSX', color: '#f7df1e' },
              { ext: 'TS/TSX', color: '#3178c6' },
              { ext: 'CSS',    color: '#1572b6' },
              { ext: 'HTML',   color: '#e34f26' },
              { ext: 'JSON',   color: '#fbbf24' },
              { ext: 'Python', color: '#3776ab' },
              { ext: 'MD',     color: '#0086d4' },
              { ext: 'Dirs',   color: '#7C3AED' },
            ].map(l => (
              <div key={l.ext} className="flex items-center gap-1.5 text-[9px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: l.color }} />
                {l.ext}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sunburst Canvas */}
      <div ref={containerRef} className="flex-1 flex justify-center items-center p-4">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="drop-shadow-[0_0_30px_rgba(124,58,237,0.15)]"
        />
      </div>
    </div>
  )
}
