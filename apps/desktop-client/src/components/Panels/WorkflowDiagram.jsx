import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Layers, Zap, ArrowRight, ShieldAlert } from 'lucide-react';

export default function WorkflowDiagram({ data }) {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    if (!data || !data.nodes || !data.edges) return;

    // Create deep copies for D3 simulation
    const simulationNodes = data.nodes.map((d) => ({ ...d }));
    
    // Map edge source/target to node objects or indices
    const simulationEdges = data.edges.map((e) => ({
      ...e,
      source: simulationNodes.find((n) => n.id === e.source) || e.source,
      target: simulationNodes.find((n) => n.id === e.target) || e.target,
    }));

    const width = 600;
    const height = 400;

    const simulation = d3.forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationEdges).id((d) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(60));

    simulation.on('tick', () => {
      // Force re-render with updated positions
      setNodes([...simulationNodes]);
      setEdges([...simulationEdges]);
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  if (!data || !data.nodes) return null;

  return (
    <div className="w-full mt-4 flex flex-col gap-3 font-mono">
      {/* Tech Stack Banner */}
      {data.tech_stack && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 flex items-start gap-3 shadow-[2px_2px_0px_#000]">
          <Layers className="text-indigo-400 mt-0.5 shrink-0" size={16} />
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">Detected Stack</div>
            <div className="text-xs text-indigo-200">{data.tech_stack}</div>
          </div>
        </div>
      )}

      {/* Physics Diagram */}
      <div 
        ref={containerRef}
        className="relative w-full h-[400px] bg-slate-950 border-2 border-black rounded-2xl overflow-hidden shadow-[inset_0px_0px_40px_rgba(0,0,0,0.5)]"
      >
        <svg width="100%" height="100%" viewBox="0 0 600 400" className="absolute inset-0">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#8B5CF6" />
            </marker>
          </defs>
          
          {/* Edges */}
          {edges.map((edge, i) => (
            <g key={`edge-${i}`}>
              <line
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeOpacity={0.6}
                markerEnd="url(#arrow)"
                className="transition-all duration-75"
              />
              {edge.relationship && (
                <text
                  x={(edge.source.x + edge.target.x) / 2}
                  y={(edge.source.y + edge.target.y) / 2 - 8}
                  fill="#A78BFA"
                  fontSize="8"
                  textAnchor="middle"
                  className="font-black uppercase tracking-widest"
                  style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
                >
                  {edge.relationship}
                </text>
              )}
            </g>
          ))}

          {/* Nodes */}
          {nodes.map((node) => (
            <foreignObject
              key={node.id}
              x={(node.x || 0) - 75}
              y={(node.y || 0) - 30}
              width="150"
              height="60"
              className="overflow-visible"
            >
              <div 
                className="flex flex-col items-center justify-center w-full h-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-lg hover:border-indigo-500 hover:scale-105 transition cursor-default p-2 text-center"
                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)' }}
              >
                <div className="text-[11px] font-bold text-white truncate w-full px-1">{node.label}</div>
                <div className="text-[8px] text-slate-400 truncate w-full px-1 mt-0.5">{node.role}</div>
              </div>
            </foreignObject>
          ))}
        </svg>
      </div>

      {/* Impact Zones */}
      {data.impact_zones && data.impact_zones.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-3 shadow-[2px_2px_0px_#000]">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <ShieldAlert size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Blast Radius</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.impact_zones.map((zone, idx) => (
              <div key={idx} className="bg-red-950/40 text-red-300 text-[10px] px-2 py-1 rounded-md border border-red-900/50 font-mono">
                {zone}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
