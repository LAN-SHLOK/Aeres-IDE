export default function MultiverseViewer() {
  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      <div className="px-4 py-3 border-b border-aeres-border bg-aeres-surface flex justify-between items-center">
        <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aeres-violet"><path d="m22 8-6 4 6 4V8Z"/><circle cx="8" cy="12" r="6"/></svg>
          Multiverse AI Generations
        </span>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {[1,2,3].map(i => (
          <div key={i} className="flex-1 border-r border-aeres-border last:border-0 flex flex-col hover:bg-white/5 transition-colors cursor-pointer group">
            <div className={`p-2 font-mono text-[10px] font-bold text-center border-b border-white/5 ${i===1 ? 'text-green-400' : i===2 ? 'text-amber-400' : 'text-blue-400'}`}>
              Generation Variant {String.fromCharCode(64+i)}
            </div>
            <div className="flex-1 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
              <div className="w-full h-2 bg-white/10 rounded mb-2" />
              <div className="w-3/4 h-2 bg-white/10 rounded mb-2" />
              <div className="w-5/6 h-2 bg-white/10 rounded mb-4" />
              <div className="w-full h-2 bg-white/10 rounded mb-2" />
              <div className="w-2/3 h-2 bg-white/10 rounded" />
            </div>
            <div className="p-3 text-center opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
              <button className="px-4 py-1.5 bg-aeres-surface border border-aeres-border rounded text-[10px] font-bold text-white hover:bg-aeres-violet hover:border-aeres-violet transition-colors">
                Apply Variant
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
