import { useState } from 'react'

export default function BranchManager({ currentBranch, branches, onCheckout }) {
  const [filter, setFilter] = useState('')
  const filtered = (branches || []).filter(b => b.toLowerCase().includes(filter.toLowerCase()))
  
  return (
    <div className="flex flex-col h-full bg-aether-bg">
      <div className="p-2 border-b border-aether-border bg-aether-surface">
        <input 
          type="text" 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search branches..." 
          className="w-full bg-aether-bg border border-aether-border rounded px-2 py-1.5 text-xs focus:border-aether-violet outline-none transition-colors placeholder:text-aether-muted text-aether-text"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        {filtered.map(b => (
          <div 
            key={b}
            onClick={() => onCheckout && onCheckout(b)}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${b === currentBranch ? 'bg-aether-violet/20 text-white' : 'hover:bg-white/5 text-aether-muted'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={b === currentBranch ? 'text-aether-violet' : ''}><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
            <span className="text-xs truncate">{b}</span>
            {b === currentBranch && <span className="ml-auto text-[9px] font-bold uppercase text-aether-violet">Active</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
