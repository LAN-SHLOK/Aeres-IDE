import { useStore } from '../../store.js'

export default function CallStack() {
  const callStack = useStore((s) => s.callStack)

  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      <div className="flex justify-between items-center mb-2 px-3 py-2 border-b border-aeres-border">
        <span className="text-[10px] uppercase text-aeres-muted font-bold tracking-tight">Call Stack</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 no-scrollbar">
        {callStack && callStack.length > 0 ? (
          callStack.map((f, i) => (
            <div key={i} className={`p-2 rounded text-[10px] cursor-pointer transition flex justify-between items-center group ${i === 0 ? 'bg-aeres-violet/20 text-white border border-aeres-violet/30' : 'hover:bg-white/5 text-aeres-muted border border-transparent'}`}>
              <div className="flex flex-col min-w-0">
                <span className="font-bold truncate text-aeres-text group-hover:text-white transition-colors">{f.name}</span>
                <span className="text-[8.5px] opacity-60 truncate font-mono text-aeres-blue">{f.file}:{f.line}</span>
              </div>
              {i === 0 && <span className="w-2 h-2 rounded-full bg-aeres-violet animate-pulse" title="Active Frame" />}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aeres-muted/40 mb-2"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/></svg>
            <span className="text-[10px] text-aeres-muted italic">Stack trace unavailable. Start a debugging session.</span>
          </div>
        )}
      </div>
    </div>
  )
}
