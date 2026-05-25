import { useState } from 'react'

export default function CommitPanel({ onCommit, stagedCount }) {
  const [msg, setMsg] = useState('')
  
  return (
    <div className="flex flex-col bg-aeres-surface border border-aeres-border rounded-lg overflow-hidden shrink-0 mt-auto m-2">
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Enter commit message..."
        rows={3}
        className="w-full bg-transparent p-2 text-xs text-aeres-text placeholder:text-aeres-muted resize-none outline-none"
      />
      <div className="bg-aeres-bg border-t border-aeres-border p-2 flex justify-between items-center">
        <span className="text-[10px] text-aeres-muted font-bold">{stagedCount} files staged</span>
        <button
          onClick={() => { if(msg.trim()) { onCommit(msg); setMsg(''); } }}
          disabled={!msg.trim() || stagedCount === 0}
          className="bg-aeres-violet hover:bg-aeres-violet/80 disabled:opacity-50 disabled:hover:bg-aeres-violet text-white px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-colors"
        >
          Commit
        </button>
      </div>
    </div>
  )
}
