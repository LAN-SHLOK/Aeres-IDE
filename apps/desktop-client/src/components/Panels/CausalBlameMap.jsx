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
        const token = await window.electron.auth.getToken()
        const resp = await fetch(`${useStore.getState().backendUrl}/api/git/causal-chain`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            repo_path: target.repoPath,
            file_path: target.filePath,
            function_name: target.functionName,
          })
        })
        const json = await resp.json()
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

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))

    // Define arrows
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999')
      .style('stroke', 'none')

    const link = svg.append('g')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('stroke', d => d.label === 'caused' ? '#E24B4A' : '#444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.label === 'caused' ? '0' : '4')
      .attr('marker-end', 'url(#arrowhead)')

    const node = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    node.append('circle')
      .attr('r', d => d.type === 'error' ? 12 : 10)
      .attr('fill', d => d.type === 'error' ? '#E24B4A' : d.isCausal ? '#7C3AED' : '#222')
      .attr('stroke', d => d.type === 'error' ? 'none' : '#444')
      .attr('stroke-width', 2)

    node.append('text')
      .text(d => d.id === 'error' ? '!' : d.author ? d.author[0] : '?')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .attr('font-size', '10px')
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
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-aether-muted">
      <div className="text-4xl mb-4 opacity-20">🔗</div>
      <p className="text-sm">Right-click a function name or error and select<br/><b>"Trace cause chain"</b> to visualize its history.</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-aether-bg">
      <div className="p-3 border-b border-aether-border flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Causal Blame Map</h3>
          <p className="text-[10px] text-aether-blue truncate max-w-[200px]">{target.functionName} in {target.filePath.split(/[/\\]/).pop()}</p>
        </div>
        {loading && <div className="w-3 h-3 border-2 border-aether-violet border-t-transparent rounded-full animate-spin"></div>}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {error && (
          <div className="absolute inset-0 bg-aether-bg/80 flex items-center justify-center p-6 text-center">
            <p className="text-xs text-aether-red">{error}</p>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {data?.nodes?.length > 0 && (
        <div className="p-3 bg-aether-surface/40 border-t border-aether-border max-h-48 overflow-y-auto">
          <h4 className="text-[10px] font-bold text-aether-muted uppercase mb-2">Recent Chain</h4>
          {data.nodes.filter(n => n.type === 'commit').map(n => (
            <div key={n.id} className="group flex items-start gap-2 mb-2 last:mb-0">
              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.isCausal ? 'bg-aether-violet shadow-[0_0_8px_rgba(124,58,237,0.5)]' : 'bg-aether-border'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-aether-text/60">{n.hash}</span>
                  <span className="text-aether-text leading-none group-hover:text-white transition-colors text-[11px] font-medium truncate max-w-[220px]">
                    {n.label}
                  </span>
                </div>
                {n.changes?.length > 0 && (
                  <p className="text-[9px] text-aether-muted italic">{n.changes.join(', ')}</p>
                )}
              </div>
            </div>
          )).slice(0, 5)}
        </div>
      )}
    </div>
  )
}
