export default function InlineDiff({ original, modified }) {
  return (
    <div className="my-4 rounded-md overflow-hidden border border-aeres-border bg-[#1e1e1e] font-mono text-[11px] leading-relaxed shadow-lg">
      <div className="flex items-center px-4 py-2 bg-aeres-surface border-b border-aeres-border">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aeres-violet mr-2"><path d="M12 2v20"/><path d="m17 22 5-5-5-5"/><path d="M7 2 2 7l5 5"/></svg>
        <span className="text-xs font-semibold text-white">Suggested Modernization</span>
      </div>
      <div className="p-4 overflow-x-auto whitespace-pre no-scrollbar">
        <div className="text-red-400 opacity-80 mb-2 line-through">{original}</div>
        <div className="text-green-400 font-bold">{modified}</div>
      </div>
    </div>
  )
}
