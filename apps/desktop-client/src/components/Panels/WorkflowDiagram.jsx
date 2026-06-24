import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import mermaid from 'mermaid';
import { Maximize2, Minimize2, Copy, Plus, Minus, RefreshCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize } from 'lucide-react';

export default function WorkflowDiagram({ data }) {
  const containerRef = useRef(null);
  const svgWrapperRef = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomBehaviorRef = useRef(null);
  const d3SvgRef = useRef(null);

  const isStringData = typeof data === 'string';

  const [errorStr, setErrorStr] = useState(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: '"Outfit", "Inter", sans-serif',
      themeVariables: {
        primaryColor: 'transparent',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#475569',
        lineColor: '#8b5cf6',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        clusterBkg: '#1e293b55',
        clusterBorder: '#334155',
        mainBkg: '#0f172a',
        nodeBorder: '#475569',
        fontSize: '12px',
        edgeLabelBackground: '#0f172a',
        clusterTextColor: '#e2e8f0'
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);

  const renderMermaid = useCallback(async () => {
    if (!isStringData || !containerRef.current) return;
    setErrorStr(null);
    try {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      // Make sure we pass a valid string
      let rawData = data;
      if (rawData.includes('```mermaid')) {
        const m = rawData.match(/```mermaid([\s\S]*?)```/);
        if (m) rawData = m[1].trim();
      }
      const { svg } = await mermaid.render(id, rawData);
      containerRef.current.innerHTML = svg;
      
      const svgEl = containerRef.current.querySelector('svg');
      if (svgEl) {
        // Prevent SVG native stretching and rely completely on D3
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.removeAttribute('viewBox'); // This prevents browser double-scaling!
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        
        // Wrap content in a group if not already wrapped
        const gWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gWrapper.classList.add('zoom-group');
        // Move all children into gWrapper
        while (svgEl.firstChild) {
          gWrapper.appendChild(svgEl.firstChild);
        }
        svgEl.appendChild(gWrapper);

        const d3Svg = d3.select(svgEl);
        d3SvgRef.current = d3Svg;

        const zoom = d3.zoom()
          .scaleExtent([0.1, 4])
          .on('zoom', (event) => {
            d3.select(gWrapper).attr('transform', event.transform);
            setZoomLevel(event.transform.k);
          });
          
        zoomBehaviorRef.current = zoom;
        d3Svg.call(zoom);
        
        // Initial center
        const bbox = gWrapper.getBBox();
        const parentRect = svgWrapperRef.current.getBoundingClientRect();
        
        const bW = bbox.width || 1;
        const bH = bbox.height || 1;
        const pW = parentRect.width || 600;
        const pH = parentRect.height || 450;

        let scale = Math.min(pW / bW, pH / bH) * 0.9;
        if (isNaN(scale) || !isFinite(scale) || scale <= 0) scale = 1;
        // Clamp scale to reasonable limits so it doesn't zoom into a dot
        scale = Math.max(0.15, Math.min(scale, 2));
        
        d3Svg.call(
          zoom.transform,
          d3.zoomIdentity.translate(
            pW / 2 - (bbox.x + bW / 2) * scale,
            pH / 2 - (bbox.y + bH / 2) * scale
          ).scale(scale)
        );
      }
    } catch (err) {
      console.error('Mermaid render error:', err);
      setErrorStr(err.message || String(err));
    }
  }, [data, isStringData]);

  useEffect(() => {
    renderMermaid();
  }, [renderMermaid, isFullScreen]); // Re-render when full screen changes to fix bounds

  if (!isStringData) {
    return <div className="text-xs text-slate-500 italic p-4 bg-slate-950/40 rounded-xl border border-slate-800">Legacy diagram format detected. Please query again to generate a new Architectural Blueprint.</div>;
  }

  const handleZoomIn = () => {
    if (d3SvgRef.current && zoomBehaviorRef.current) {
      d3SvgRef.current.transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (d3SvgRef.current && zoomBehaviorRef.current) {
      d3SvgRef.current.transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1 / 1.3);
    }
  };

  const handleReset = () => {
    renderMermaid(); // Re-render will recenter
  };

  const handlePan = (dx, dy) => {
    if (d3SvgRef.current && zoomBehaviorRef.current) {
      d3SvgRef.current.transition().duration(250).call(zoomBehaviorRef.current.translateBy, dx, dy);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(data);
  };

  const DiagramContent = (
    <div className={`relative flex flex-col items-center justify-center bg-[#0f172a] rounded-2xl overflow-hidden shadow-xl ${isFullScreen ? 'w-full h-full' : 'w-full h-[450px] border border-slate-700/50 mt-4'}`}>
      
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        <button onClick={handleCopy} title="Copy Mermaid Syntax" className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-600 shadow-md backdrop-blur-md transition-colors">
          <Copy size={14} />
        </button>
        <button onClick={() => setIsFullScreen(!isFullScreen)} title={isFullScreen ? "Exit Full Screen" : "Full Screen"} className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-600 shadow-md backdrop-blur-md transition-colors">
          {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      <div className="absolute bottom-4 right-4 flex items-end gap-2 z-10">
        <div className="grid grid-cols-3 grid-rows-3 gap-1 bg-slate-800/80 p-1.5 rounded-lg border border-slate-600 shadow-lg backdrop-blur-md">
          <div />
          <button onClick={() => handlePan(0, 50)} className="flex items-center justify-center p-1 bg-slate-900/50 hover:bg-slate-700 text-slate-300 rounded"><ChevronUp size={14} /></button>
          <div />
          <button onClick={() => handlePan(50, 0)} className="flex items-center justify-center p-1 bg-slate-900/50 hover:bg-slate-700 text-slate-300 rounded"><ChevronLeft size={14} /></button>
          <button onClick={handleReset} title="Reset View" className="flex items-center justify-center p-1 bg-slate-900/50 hover:bg-slate-700 text-slate-300 rounded"><RefreshCcw size={12} /></button>
          <button onClick={() => handlePan(-50, 0)} className="flex items-center justify-center p-1 bg-slate-900/50 hover:bg-slate-700 text-slate-300 rounded"><ChevronRight size={14} /></button>
          <div />
          <button onClick={() => handlePan(0, -50)} className="flex items-center justify-center p-1 bg-slate-900/50 hover:bg-slate-700 text-slate-300 rounded"><ChevronDown size={14} /></button>
          <div />
        </div>
        
        <div className="flex flex-col gap-1 bg-slate-800/80 p-1.5 rounded-lg border border-slate-600 shadow-lg backdrop-blur-md">
          <button onClick={handleZoomIn} title="Zoom In" className="flex items-center justify-center p-1 bg-slate-900/50 hover:bg-slate-700 text-slate-300 rounded mb-1"><Plus size={14} /></button>
          <button onClick={handleReset} title="Fit to Screen" className="flex items-center justify-center p-1 bg-slate-900/50 hover:bg-slate-700 text-slate-300 rounded mb-1"><Maximize size={12} /></button>
          <button onClick={handleZoomOut} title="Zoom Out" className="flex items-center justify-center p-1 bg-slate-900/50 hover:bg-slate-700 text-slate-300 rounded"><Minus size={14} /></button>
        </div>
      </div>

      <div ref={svgWrapperRef} className="w-full h-full overflow-hidden cursor-move">
        {errorStr ? (
           <div className="w-full h-full flex items-center justify-center flex-col p-8 text-center bg-red-950/10">
             <div className="text-red-500 font-bold mb-2">Mermaid Generation Error</div>
             <div className="text-xs text-red-400 font-mono text-left max-w-full overflow-auto bg-black/40 p-4 rounded-xl border border-red-900/30 whitespace-pre-wrap max-h-[300px]">
               {errorStr}
               {"\n\nRaw syntax:\n"}
               {data}
             </div>
           </div>
        ) : (
           <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
        )}
      </div>
    </div>
  );

  if (isFullScreen) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-fade-in">
        {DiagramContent}
      </div>,
      document.body
    );
  }

  return DiagramContent;
}
