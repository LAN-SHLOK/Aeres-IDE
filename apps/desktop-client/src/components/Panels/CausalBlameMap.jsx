import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useStore } from '../../store.js'

export default function CausalBlameMap() {
  const target = useStore((s) => s.causalTarget)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const svgRef = useRef(null)

  useEffect(() => {
    if (!target) return
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const e = window.electron
        if (!e?.git?.causalChain) throw new Error('Git Bridge not available')

        const json = await e.git.causalChain({
          repoPath: target.repoPath,
          filePath: target.filePath,
          functionName: target.functionName,
        })
        
        if (json.error) setError(json.error)
        else setData(json)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [target])

  useEffect(() => {
    if (!data || !svgRef.current) return

    const width = 400
    const height = 500
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const formattedEdges = data.edges.map(e => ({
      ...e,
      source: e.from,
      target: e.to
    }))

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(formattedEdges).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))

    // Grid pattern for blueprint look
    svg.append('defs').append('pattern')
      .attr('id', 'blueprint-grid')
      .attr('width', 20)
      .attr('height', 20)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('path')
      .attr('d', 'M 20 0 L 0 0 0 20')
      .attr('fill', 'none')
      .attr('stroke', '#1e293b') // slate-800
      .attr('stroke-width', 0.5)

    svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#blueprint-grid)')

    // Define arrows
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#475569') // slate-600
      .style('stroke', 'none')

    const link = svg.append('g')
      .selectAll('line')
      .data(formattedEdges)
      .join('line')
      .attr('stroke', d => d.label === 'caused' ? '#ef4444' : '#475569')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', d => d.label === 'caused' ? '0' : '4')
      .attr('marker-end', 'url(#arrowhead)')

    const node = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        if (d.type === 'commit' && d.hash) {
          // Implement jump to commit logic
          console.log('Jumping to commit:', d.hash)
        }
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    node.append('rect')
      .attr('x', -25)
      .attr('y', -12)
      .attr('width', 50)
      .attr('height', 24)
      .attr('rx', 2)
      .attr('fill', d => d.type === 'error' ? '#ef4444' : d.isCausal ? '#7C3AED' : '#334155')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)

    node.append('text')
      .text(d => d.id === 'error' ? '!' : d.hash || '?')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono')
      .attr('font-weight', 'bold')

    node.append('title').text(d => `${d.label}\n${d.author || ''}\n${d.changes?.join(', ') || ''}`)

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      node
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }
    function dragged(event) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return () => simulation.stop()
  }, [data])

  if (!target) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-aeres-muted">
      <div className="text-4xl mb-4 opacity-20">🔗</div>
      <p className="text-sm">Right-click a function name or error and select<br/><b>"Trace cause chain"</b> to visualize its history.</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      <div className="p-3 border-b border-aeres-border flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Causal Blame Map</h3>
          <p className="text-[10px] text-aeres-blue truncate max-w-[200px]">{target.functionName} in {target.filePath.split(/[/\\]/).pop()}</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <div className="w-3 h-3 border-2 border-aeres-violet border-t-transparent rounded-full animate-spin"></div>}
          <button
            onClick={() => {
              useStore.setState({ causalTarget: null, activeRightTab: null })
            }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-red-500/20 border border-slate-700/50 hover:border-red-500/40 rounded transition-all active:scale-95"
            title="Close Causal Blame Map"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {error && (
          <div className="absolute inset-0 bg-aeres-bg/80 flex items-center justify-center p-6 text-center">
            <p className="text-xs text-aeres-red">{error}</p>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {data?.nodes?.length > 0 && (
        <div className="p-3 bg-aeres-surface/40 border-t border-aeres-border max-h-48 overflow-y-auto">
          <h4 className="text-[10px] font-bold text-aeres-muted uppercase mb-2">Recent Chain</h4>
          {data.nodes.filter(n => n.type === 'commit').map(n => (
            <div key={n.id} className="group flex items-start gap-2 mb-2 last:mb-0">
              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.isCausal ? 'bg-aeres-violet shadow-[0_0_8px_rgba(124,58,237,0.5)]' : 'bg-aeres-border'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-aeres-text/60">{n.hash}</span>
                  <span className="text-aeres-text leading-none group-hover:text-white transition-colors text-[11px] font-medium truncate max-w-[220px]">
                    {n.label}
                  </span>
                </div>
                {n.changes?.length > 0 && (
                  <p className="text-[9px] text-aeres-muted italic">{n.changes.join(', ')}</p>
                )}
              </div>
            </div>
          )).slice(0, 5)}
        </div>
      )}
    </div>
  )
}
