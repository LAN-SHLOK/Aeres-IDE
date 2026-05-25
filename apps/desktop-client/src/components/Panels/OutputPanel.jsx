import { useState } from 'react'

export default function OutputPanel() {
  const [filter, setFilter] = useState('Build')
  
  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      <div className="flex p-1 bg-aeres-surface border-b border-aeres-border">
        {['Build', 'Log', 'Aeres Tasks'].map(t => (
          <button 
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${filter === t ? 'bg-aeres-violet text-white' : 'text-aeres-muted hover:text-white hover:bg-white/5'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 p-3 font-mono text-[11px] text-aeres-muted overflow-auto no-scrollbar">
        <span className="text-aeres-blue">{`[${filter}]`}</span> System initialized. Listening for emitted events...
      </div>
    </div>
  )
}
