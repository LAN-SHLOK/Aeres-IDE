import { useState, useEffect, useMemo, useRef } from 'react'
import { useStore } from '../../store.js'
import { detectLanguage } from '../../utils/langDetect.js'
import * as d3 from 'd3'
import { Map, Zap } from 'lucide-react'

export default function ArchVisualizer() {
  const rootPath = useStore((s) => s.rootPath)
  const fileTree = useStore((s) => s.fileTree)
  const openTab = useStore((s) => s.openTab)
  const gitStatus = useStore((s) => s.gitStatus)
  const diagnostics = useStore((s) => s.diagnostics)
  
  const svgRef = useRef(null)
  const hoverTimeoutRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanLogs, setScanLogs] = useState([])
  const [hoveredNode, setHoveredNode] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseEnterNode = (node) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHoveredNode(node)
  }

  const handleMouseLeaveNode = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNode(null)
    }, 300)
  }

  
  // Recursively flatten tree nodes into files
  const allFiles = useMemo(() => {
    if (!fileTree) return []
    const files = []
    
    function recurse(nodes) {
      if (!Array.isArray(nodes)) return
      nodes.forEach(node => {
        if (node.type === 'file') {
          files.push(node)
        } else if (node.type === 'dir' && node.children) {
          recurse(node.children)
        }
      })
    }
    
    recurse(fileTree)
    return files
  }, [fileTree])

  // Filter down to code files only for better visualization clarity
  const codeFiles = useMemo(() => {
    const codeExts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.cpp', '.c', '.h', '.css', '.html', '.json']
    return allFiles.filter(f => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      return codeExts.includes(ext)
    }).slice(0, 45) // limit to 45 nodes for optimal visual density
  }, [allFiles])

  // Scan simulation triggers on project load or manual trigger
  const runScan = () => {
    setScanning(true)
    setScanProgress(0)
    setScanLogs([])
    
    const logs = [
      '[Aeres Compiler] Spawning semantic workspace scanner...',
      '[Directory Analyzer] Walking codebase file trees...',
      '[Module Grapher] Building node import relationship map...',
      '[LSP Diagnostic Collector] Mapping live active warning models...',
      '[Graph Complete] Rendering interactive architectural canvas!'
    ]
    
    let step = 0
    const interval = setInterval(() => {
      if (step < logs.length) {
        setScanLogs(prev => [...prev, logs[step]])
        setScanProgress((step + 1) * 20)
        step++
      } else {
        clearInterval(interval)
        setTimeout(() => setScanning(false), 500)
      }
    }, 300)
  }

  // Trigger scan when project rootPath changes
  useEffect(() => {
    if (rootPath) {
      runScan()
    }
  }, [rootPath])

  // Calculate coordinates for nodes around a central gravity hub in a premium orbital spiral
  const nodes = useMemo(() => {
    const cx = 400
    const cy = 300
    
    return codeFiles.map((file, idx) => {
      // Golden spiral distribution
      const goldenAngle = 137.5 * (Math.PI / 180)
      const radius = 45 + Math.sqrt(idx) * 32
      const angle = idx * goldenAngle
      
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle)
      
      // Determine Git change status - normalize both paths to forward slashes and compare
      const nodePath = file.path.replace(/\\/g, '/')
      const gitFiles = gitStatus.files || []
      const matchedGitFile = gitFiles.find(gf => {
        const rel = gf.path.replace(/\\/g, '/')
        // Check if the absolute node path ends with the relative git path
        return nodePath.endsWith('/' + rel) || nodePath === rel
      })
      const isModified = !!matchedGitFile && (
        matchedGitFile.x === 'M' || matchedGitFile.y === 'M' || 
        matchedGitFile.x === 'A' || matchedGitFile.x === '?'
      )
      
      // Determine compilation issues from live LSP diagnostics
      // Check both forward-slash and backslash versions of the path
      const fileMarkers = diagnostics[file.path] || diagnostics[file.path.replace(/\\/g, '/')] || diagnostics[file.path.replace(/\//g, '\\')] || []
      const hasErrors = fileMarkers.some(m => m.severity === 1 || m.severity === 'error' || m.message?.toLowerCase().includes('error'))
      const hasWarnings = fileMarkers.some(m => m.severity === 2 || m.severity === 'warning')
      
      let status = 'healthy'
      if (hasErrors) status = 'error'
      else if (hasWarnings) status = 'warning'
      else if (isModified) status = 'modified'
      
      return {
        ...file,
        x,
        y,
        status,
        issuesCount: fileMarkers.length,
        gitIndicator: matchedGitFile ? (matchedGitFile.x || matchedGitFile.y) : null
      }
    })
  }, [codeFiles, gitStatus, diagnostics])

  // D3 zoom/pan setup
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const g = svg.select('g.arch-graph')
    
    const zoom = d3.zoom()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    
    svg.call(zoom)
    
    // Start slightly zoomed out to fit content
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.85))
    
    return () => svg.on('.zoom', null)
  }, [scanning]) // Re-attach after scan completes

  // Calculate Health Index percentage
  const healthStats = useMemo(() => {
    if (nodes.length === 0) return { health: 100, errors: 0, warnings: 0, modified: 0 }
    let errors = 0
    let warnings = 0
    let modified = 0
    
    nodes.forEach(n => {
      if (n.status === 'error') errors++
      else if (n.status === 'warning') warnings++
      else if (n.status === 'modified') modified++
    })
    
    const healthyCount = nodes.length - errors
    const health = Math.round((healthyCount / nodes.length) * 100)
    
    return { health, errors, warnings, modified }
  }, [nodes])

  // Handle clicking on node to open file inside Monaco
  const handleNodeClick = (node) => {
    const lang = detectLanguage(node.name)
    // Read file via electron and open inside editor
    if (window.electron?.fs?.readFile) {
      window.electron.fs.readFile(node.path).then(content => {
        openTab({ path: node.path, name: node.name, language: lang, content })
      })
    }
  }

  // Pre-populate AI Agent Prompt about a specific node
  const askAeresAboutNode = (node) => {
    // Focus active sidebar tab to AI Chat
    useStore.setState({ rightPanelOpen: true, activeRightTab: 'chat' })
    
    // Dispatch custom event to auto populate chat input field
    const ev = new CustomEvent('aeres:add-to-chat', { detail: { name: node.name } })
    document.dispatchEvent(ev)
    
    const focusEv = new CustomEvent('aeres:focus-chat')
    document.dispatchEvent(focusEv)
  }

  if (!rootPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-aeres-muted bg-aeres-bg">
        <div className="relative mb-4 rotate-[-6deg] hover:rotate-[6deg] transition-transform duration-300">
          <div className="absolute inset-0 bg-aeres-violet/10 blur-xl rounded-full" />
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl border-2 border-black bg-aeres-surface text-aeres-violet shadow-[2px_2px_0px_#000]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </div>
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Architecture Visualizer</h3>
        <p className="text-[10px] text-aeres-muted max-w-[200px] leading-relaxed">
          Open a project workspace folder to visualize module dependencies, codebase health maps, and file anomaly reports.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-aeres-bg select-none relative animate-fade-in">
      {/* Title bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-aeres-border px-3 bg-aeres-surface/40">
        <span className="text-[9px] font-black uppercase tracking-widest text-aeres-muted flex items-center gap-1.5">
          <Map size={14} className="text-aeres-violet font-bold" /> Architecture Map
          <span className="text-[8px] text-slate-500 font-mono ml-2">(Scroll to zoom, drag to pan)</span>
        </span>
        <button
          onClick={runScan}
          disabled={scanning}
          className="rounded-full border-2 border-black bg-aeres-surface px-2.5 py-0.5 text-[8px] text-white hover:bg-aeres-violet hover:text-black font-extrabold uppercase transition shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] cursor-pointer"
        >
          Rescan Workspace
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Scanning progress overlay */}
        {scanning && (
          <div className="absolute inset-0 bg-[#0c0d14]/90 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-[340px] bg-aeres-surface border-2 border-black p-4 rounded-2xl shadow-[2px_2px_0px_#000] font-mono text-[9px] text-slate-300 space-y-2">
              <div className="flex items-center justify-between border-b border-black/20 pb-2 mb-2">
                <span className="font-bold text-aeres-violet uppercase tracking-wider">Aeres Architecture Scanner</span>
                <span className="text-[8px] opacity-60">v1.2.0</span>
              </div>
              <div className="flex flex-col gap-1 max-h-32 overflow-hidden text-left pl-1">
                {scanLogs.map((log, i) => (
                  <div key={i} className="truncate text-slate-300 font-medium">{log}</div>
                ))}
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-[8px] text-aeres-muted uppercase font-bold mb-1">
                  <span>Parsing AST Modules</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full bg-black/40 border border-black/50 rounded-full h-2 overflow-hidden p-[1px]">
                  <div 
                    className="bg-aeres-violet h-full rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LEFT HUD PANEL: Health & Dashboard */}
        <div className="w-[180px] shrink-0 border-r border-aeres-border bg-aeres-surface/20 p-3 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            {/* Health Ring Meter */}
            <div className="border-2 border-black bg-aeres-surface p-2.5 rounded-2xl shadow-[2px_2px_0px_#000] text-center">
              <span className="text-[8px] font-black uppercase tracking-wider text-aeres-muted block mb-1">System Health Map</span>
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="26" strokeWidth="4" stroke="#161722" fill="transparent" />
                  <circle cx="32" cy="32" r="26" strokeWidth="4" 
                    stroke={healthStats.health > 80 ? '#22c55e' : healthStats.health > 50 ? '#f59e0b' : '#ef4444'} 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - healthStats.health / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute text-xs font-black text-white">{healthStats.health}%</span>
              </div>
            </div>

            {/* Code Stats Grid */}
            <div className="space-y-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-aeres-muted pl-1">Workspace Index</span>
              
              <div className="border-2 border-black bg-aeres-surface p-2 rounded-xl flex items-center justify-between text-[10px] shadow-[2px_2px_0px_#000]">
                <span className="text-aeres-muted font-bold">Total Files</span>
                <span className="font-extrabold text-white font-mono">{nodes.length}</span>
              </div>

              <div className="border-2 border-black bg-aeres-surface p-2 rounded-xl flex items-center justify-between text-[10px] shadow-[2px_2px_0px_#000]">
                <span className="text-red-400 font-bold">Errors</span>
                <span className="font-extrabold text-red-400 font-mono">{healthStats.errors}</span>
              </div>

              <div className="border-2 border-black bg-aeres-surface p-2 rounded-xl flex items-center justify-between text-[10px] shadow-[2px_2px_0px_#000]">
                <span className="text-amber-400 font-bold">Warnings</span>
                <span className="font-extrabold text-amber-400 font-mono">{healthStats.warnings}</span>
              </div>

              <div className="border-2 border-black bg-aeres-surface p-2 rounded-xl flex items-center justify-between text-[10px] shadow-[2px_2px_0px_#000]">
                <span className="text-cyan-400 font-bold">Git Modified</span>
                <span className="font-extrabold text-cyan-400 font-mono">{healthStats.modified}</span>
              </div>
            </div>
          </div>

          {/* Color Key Guide */}
          <div className="border border-black/30 bg-black/10 rounded-xl p-2 space-y-1.5 text-[9px] font-bold">
            <span className="text-aeres-muted uppercase text-[8px] tracking-wider block mb-1">Color Markers</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-aeres-violet border border-black" />
              <span>Healthy Code</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 border border-black" />
              <span>Git Modified</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 border border-black" />
              <span>LSP Warnings</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-red-500 border border-black" />
              <span>LSP Errors</span>
            </div>
          </div>
        </div>

        {/* CENTER INTERACTIVE WORKSPACE GALAXY MAP */}
        <div className="flex-1 overflow-hidden relative bg-black/20"
          onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        >
          <svg ref={svgRef} className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
            <g className="arch-graph">
              {/* Grid styling background */}
              <defs>
                <pattern id="archGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="800" height="600" fill="url(#archGrid)" />

              {/* Connector Lines between central hub and spiral nodes */}
              {nodes.map((node, i) => (
                <line
                  key={`line-${i}`}
                  x1={400}
                  y1={300}
                  x2={node.x}
                  y2={node.y}
                  stroke={
                    node.status === 'error' ? 'rgba(239,68,68,0.25)' :
                    node.status === 'warning' ? 'rgba(245,158,11,0.2)' :
                    node.status === 'modified' ? 'rgba(34,211,238,0.2)' :
                    'rgba(124,58,237,0.1)'
                  }
                  strokeWidth={node.status === 'error' ? 2 : 1}
                  strokeDasharray={node.status === 'modified' ? '4,4' : 'none'}
                />
              ))}

              {/* Central Root Directory Gravity Node */}
              <g transform="translate(400,300)" className="cursor-pointer group">
                <circle
                  r="24"
                  fill="#13141f"
                  stroke="var(--aeres-violet)"
                  strokeWidth="2.5"
                  className="group-hover:scale-105 transition-transform duration-300"
                />
                <circle
                  r="30"
                  fill="none"
                  stroke="var(--aeres-violet)"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  className="animate-spin"
                  style={{ animationDuration: '20s' }}
                />
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fill="white"
                  className="text-[9px] font-black uppercase tracking-widest pointer-events-none"
                >
                  {rootPath.split(/[/\\]/).pop()?.substring(0, 7) || 'ROOT'}
                </text>
              </g>

              {/* Individual Spiral Code File Nodes */}
              {nodes.map((node, i) => {
                const color = 
                  node.status === 'error' ? '#ef4444' : 
                  node.status === 'warning' ? '#f59e0b' : 
                  node.status === 'modified' ? '#22d3ee' : 
                  '#7C3AED'

                return (
                  <g 
                    key={`node-${i}`} 
                    transform={`translate(${node.x},${node.y})`}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => handleMouseEnterNode(node)}
                    onMouseLeave={handleMouseLeaveNode}
                    className="cursor-pointer group"
                  >
                    {/* Floating effect pulse */}
                    {node.status === 'error' && (
                      <circle
                        r="16"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        className="animate-ping opacity-35"
                      />
                    )}

                    {/* High contrast brutalist double border circle */}
                    <circle
                      r="11"
                      fill="#13141f"
                      stroke={color}
                      strokeWidth="2"
                      className="group-hover:scale-115 transition-all duration-300"
                    />
                    <circle
                      r="7"
                      fill={color}
                      className="group-hover:scale-110 transition-all duration-300"
                    />
                    
                    {/* Extension name badge display on hover */}
                    <text
                      textAnchor="middle"
                      dy="-15"
                      fill="white"
                      className="text-[7.5px] font-extrabold uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    >
                      {node.name}
                    </text>

                    {/* Status badge for modified */}
                    {node.status === 'modified' && (
                      <text textAnchor="middle" dy="3.5" fill="#0e1015" className="text-[6px] font-black pointer-events-none">M</text>
                    )}
                    {node.status === 'error' && (
                      <text textAnchor="middle" dy="3.5" fill="#0e1015" className="text-[6px] font-black pointer-events-none">!</text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Interactive Tooltip Card overlay */}
          {hoveredNode && (
            <div 
              className="fixed pointer-events-auto bg-[#13141f]/95 border-2 border-black rounded-2xl shadow-2xl p-3 z-30 w-56 backdrop-blur-md animate-in fade-in duration-100 flex flex-col gap-2"
              onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }}
              onMouseLeave={handleMouseLeaveNode}
              style={{
                top: Math.max(10, mousePos.y - 120),
                left: Math.max(10, mousePos.x + 15)
              }}
            >
              <div className="flex items-center gap-1.5 border-b border-black/20 pb-1.5">
                <span className="text-xs font-black text-white truncate max-w-[130px]" title={hoveredNode.name}>
                  {hoveredNode.name}
                </span>
                <span className="text-[7.5px] px-1 bg-black/40 text-aeres-muted font-bold rounded">
                  {hoveredNode.name.substring(hoveredNode.name.lastIndexOf('.')).toUpperCase()}
                </span>
              </div>

              <div className="space-y-1 text-[9px] text-slate-300 font-medium">
                <div className="flex justify-between">
                  <span className="text-aeres-muted">Path:</span>
                  <span className="truncate max-w-[110px] text-slate-400 font-mono" title={hoveredNode.path}>
                    {hoveredNode.path}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-aeres-muted">LSP Diagnostics:</span>
                  <span className={hoveredNode.issuesCount > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {hoveredNode.issuesCount} active issues
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-aeres-muted">Git State:</span>
                  <span className={hoveredNode.status === 'modified' ? 'text-cyan-400 font-bold' : 'text-aeres-muted'}>
                    {hoveredNode.status === 'modified' ? `Modified (${hoveredNode.gitIndicator || 'M'})` : hoveredNode.status === 'error' ? 'Has Errors' : hoveredNode.status === 'warning' ? 'Has Warnings' : 'Clean'}
                  </span>
                </div>
              </div>

              <div className="flex gap-1.5 pt-1.5 border-t border-black/20 mt-1">
                <button
                  onClick={() => handleNodeClick(hoveredNode)}
                  className="flex-1 py-1 bg-aeres-surface border border-black/55 text-white hover:bg-white/10 text-[8px] font-black rounded-lg transition uppercase cursor-pointer"
                >
                  Open Editor
                </button>
                <button
                  onClick={() => askAeresAboutNode(hoveredNode)}
                  className="flex-1 py-1 bg-aeres-violet text-black hover:scale-102 text-[8px] font-black rounded-lg transition uppercase cursor-pointer flex items-center justify-center gap-0.5"
                >
                  <Zap size={10} /> Ask AI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
