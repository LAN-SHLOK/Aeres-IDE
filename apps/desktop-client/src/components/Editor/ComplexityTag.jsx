export default function ComplexityTag({ score }) {
  const getBadge = (s) => {
    if (s <= 5) return { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Low Complexity' }
    if (s <= 10) return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Moderate' }
    return { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'High Complexity' }
  }
  
  const badge = getBadge(score || 0)
  
  return (
    <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 ${badge.color}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><circle cx="8" cy="12" r="6"/></svg>
      {badge.label} ({score || 0})
    </div>
  )
}
