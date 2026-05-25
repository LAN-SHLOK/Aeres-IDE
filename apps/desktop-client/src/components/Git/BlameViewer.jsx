export default function BlameViewer() {
  return (
    <div className="p-4 flex flex-col items-center justify-center h-full text-center text-aeres-muted">
       <div className="w-12 h-12 rounded-full bg-aeres-surface flex items-center justify-center mb-3">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aeres-violet"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
       </div>
       <h3 className="text-sm font-bold text-white mb-1">Git Blame Annotations</h3>
       <p className="text-xs max-w-[200px]">Hover over lines in the editor to see author, commit, and date information.</p>
    </div>
  )
}
