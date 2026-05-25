import React from 'react'

export default function LiveStats() {
  return (
    <div className="flex items-center gap-4 px-3 py-1 bg-white/[0.02] border border-white/[0.05] rounded-lg">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
        <span className="text-[10px] uppercase tracking-wider text-aeres-muted font-bold">Neural Core: Active</span>
      </div>
      
      <div className="h-3 w-px bg-white/10"></div>
      
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[8px] text-white/30 uppercase leading-none mb-0.5">Scanned</span>
          <span className="text-[10px] text-white font-mono leading-none">1.2k Files</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] text-white/30 uppercase leading-none mb-0.5">Latency</span>
          <span className="text-[10px] text-aeres-violet font-mono leading-none">42ms</span>
        </div>
      </div>
    </div>
  )
}
