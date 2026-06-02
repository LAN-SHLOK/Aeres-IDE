import React, { useState, useRef } from 'react'

export default function WebPreviewPanel() {
  const [url, setUrl] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [device, setDevice] = useState('desktop') // 'mobile', 'tablet', 'desktop'
  const [zoom, setZoom] = useState(100)
  
  // Panning state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const iframeRef = useRef(null)

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
  }

  // Panning Handlers
  const handleMouseDown = (e) => {
    // Only start panning if clicking directly on the canvas background
    if (e.target.id === 'canvas-container' || e.target.id === 'pan-wrapper') {
      setIsPanning(true)
    }
  }

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }))
    }
  }

  const handleMouseUp = () => setIsPanning(false)

  const handleGo = (e) => {
    e.preventDefault()
    let finalUrl = inputUrl
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'http://' + finalUrl
    }
    if (finalUrl.includes('//localhost:')) {
      finalUrl = finalUrl.replace('//localhost:', '//127.0.0.1:')
    }
    setUrl(finalUrl)
    setInputUrl(finalUrl)
  }

  // Device dimensions
  const getDeviceDimensions = () => {
    switch (device) {
      case 'mobile': return { width: 390, height: 844, bezelRadius: '2.5rem' } // iPhone 14 Pro
      case 'tablet': return { width: 820, height: 1180, bezelRadius: '1.5rem' } // iPad Air
      case 'desktop': return { width: '100%', height: '100%', bezelRadius: '0px' }
      default: return { width: '100%', height: '100%', bezelRadius: '0px' }
    }
  }

  const { width, height, bezelRadius } = getDeviceDimensions()

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 font-sans animate-in fade-in duration-300 relative overflow-hidden">
      
      {/* 1. Sleek Address Bar / Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0d0e15] shrink-0 z-10 shadow-lg">
        
        {/* URL Input */}
        <form onSubmit={handleGo} className="flex flex-1 max-w-xl items-center relative">
          <div className="absolute left-3 text-slate-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-[#161622] text-slate-200 text-xs px-10 py-1.5 rounded-full border border-slate-700/50 focus:outline-none focus:border-aeres-violet focus:ring-1 focus:ring-aeres-violet/30 transition-all shadow-inner"
            placeholder="Enter URL to preview..."
          />
          <button type="submit" className="hidden" />
          <button 
            type="button" 
            onClick={handleRefresh}
            title="Refresh Canvas"
            className="absolute right-2 p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </form>

        {/* Device Toggles */}
        <div className="flex items-center gap-1.5 bg-[#161622] p-1 rounded-lg border border-slate-700/50 ml-4">
          <button 
            onClick={() => setDevice('mobile')}
            title="Mobile (iPhone 14)"
            className={`p-1.5 rounded transition-all ${device === 'mobile' ? 'bg-aeres-violet text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          </button>
          <button 
            onClick={() => setDevice('tablet')}
            title="Tablet (iPad)"
            className={`p-1.5 rounded transition-all ${device === 'tablet' ? 'bg-aeres-violet text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          </button>
          <button 
            onClick={() => setDevice('desktop')}
            title="Desktop Responsive"
            className={`p-1.5 rounded transition-all ${device === 'desktop' ? 'bg-aeres-violet text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-slate-500 font-bold">{zoom}%</span>
          <input 
            type="range" 
            min="25" 
            max="150" 
            value={zoom} 
            onChange={(e) => setZoom(e.target.value)}
            className="w-24 accent-aeres-violet cursor-pointer"
          />
        </div>

      </div>

      {/* 2. Interactive Canvas Area */}
      <div 
        id="canvas-container"
        className={`flex-1 w-full bg-[#050508] relative overflow-hidden flex items-center justify-center p-8 pattern-dots ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ backgroundPosition: `${pan.x}px ${pan.y}px` }}
      >
        
        {/* Panning Wrapper */}
        <div id="pan-wrapper" className="w-full h-full absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        
        {/* Device Frame */}
        <div 
          className="relative flex items-center justify-center transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] origin-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-white pointer-events-auto"
          style={{ 
            width: typeof width === 'number' ? `${width}px` : width, 
            height: typeof height === 'number' ? `${height}px` : height,
            borderRadius: bezelRadius,
            transform: `scale(${zoom / 100})`,
            border: device !== 'desktop' ? '12px solid #111' : 'none',
            boxShadow: device !== 'desktop' ? 'inset 0 0 0 2px #333, 0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none',
            outline: device !== 'desktop' ? '1px solid #333' : 'none'
          }}
        >
          {/* Dynamic Island for Mobile */}
          {device === 'mobile' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-full z-20 flex items-center justify-center pointer-events-none">
               <div className="w-2.5 h-2.5 bg-slate-800 rounded-full absolute right-2" />
            </div>
          )}
          
          {/* Tablet Camera */}
          {device === 'tablet' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#222] rounded-full z-20" />
          )}

          {/* Embedded Web Preview */}
          {url ? (
            <iframe
              ref={iframeRef}
              src={url}
              title="Aeres Live Preview"
              className={`w-full h-full border-none outline-none z-10 bg-white ${isPanning ? 'pointer-events-none' : ''}`}
              style={{ borderRadius: device !== 'desktop' ? '1.5rem' : '0px' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : (
            <div 
              className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-[#0a0a0f] z-10 select-none" 
              style={{ borderRadius: device !== 'desktop' ? '1.5rem' : '0px' }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 opacity-30"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <p className="text-sm font-medium tracking-wide">Ready for Preview</p>
              <p className="text-xs opacity-70 mt-1">Enter a website link above and press Enter.</p>
            </div>
          )}
        </div>
        </div>
      </div>
      
      {/* 3. Footer Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-800 bg-[#0d0e15] shrink-0 text-[10px] text-slate-500 select-none">
         <div className="flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="font-bold uppercase tracking-wider">Device Lab Active</span>
         </div>
         <div>
            {device === 'desktop' ? 'Responsive Viewport' : `${width}x${height} Logical Resolution`}
         </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .pattern-dots {
          background-image: radial-gradient(#1e1e2d 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}} />
    </div>
  )
}
