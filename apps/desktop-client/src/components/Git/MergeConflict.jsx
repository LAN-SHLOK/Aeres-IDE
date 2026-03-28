export default function MergeConflict() {
  return (
    <div className="flex items-center justify-center p-6 border border-amber-500/30 bg-amber-500/10 rounded-lg text-amber-200 m-4">
      <div className="text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div className="text-sm font-bold uppercase tracking-widest mb-1">Merge Conflict</div>
        <div className="text-xs opacity-80">Use the Editor to resolve inline conflicts before committing.</div>
      </div>
    </div>
  )
}
