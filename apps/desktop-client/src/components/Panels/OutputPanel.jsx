import { useState } from 'react'

export default function OutputPanel() {
  const [filter, setFilter] = useState('Build')
  
  return (
    <div className="flex flex-col h-full bg-aether-bg">
      <div className="flex p-1 bg-aether-surface border-b border-aether-border">
        {['Build', 'Log', 'Aether Tasks'].map(t => (
          <button 
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${filter === t ? 'bg-aether-violet text-white' : 'text-aether-muted hover:text-white hover:bg-white/5'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 p-3 font-mono text-[11px] text-aether-muted overflow-auto no-scrollbar">
        <span className="text-aether-blue">{`[${filter}]`}</span> System initialized. Listening for emitted events...
      </div>
    </div>
  )
}
