export default function CommitHistory({ commits }) {
  return (
    <div className="flex flex-col h-full bg-aether-bg">
      <div className="p-2 border-b border-aether-border bg-aether-surface text-[10px] font-bold uppercase tracking-wider text-aether-muted">
        Commit History
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3 no-scrollbar relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-aether-border z-0" />
        {commits && commits.length > 0 ? (
          commits.map((c, i) => (
            <div key={i} className="relative z-10 flex gap-3">
              <div className="w-4 h-4 rounded-full bg-aether-surface border-2 border-aether-violet flex-shrink-0 mt-0.5" />
              <div className="flex-1 bg-aether-surface/40 border border-aether-border rounded-lg p-2 hover:border-aether-violet/50 transition-colors group cursor-pointer">
                <div className="text-xs font-bold text-white mb-1 group-hover:text-aether-violet transition-colors">{c.message}</div>
                <div className="flex justify-between items-center text-[10px] text-aether-muted">
                  <span className="truncate max-w-[120px]">{c.author}</span>
                  <span className="font-mono bg-aether-bg px-1 rounded text-aether-blue">{c.hash}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="relative z-10 text-center text-[10px] text-aether-muted pt-8 italic">No recent commits found.</div>
        )}
      </div>
    </div>
  )
}
