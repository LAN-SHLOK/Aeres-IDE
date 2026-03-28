import { useState } from 'react'

export default function CommitPanel({ onCommit, stagedCount }) {
  const [msg, setMsg] = useState('')
  
  return (
    <div className="flex flex-col bg-aether-surface border border-aether-border rounded-lg overflow-hidden shrink-0 mt-auto m-2">
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Enter commit message..."
        rows={3}
        className="w-full bg-transparent p-2 text-xs text-aether-text placeholder:text-aether-muted resize-none outline-none"
      />
      <div className="bg-aether-bg border-t border-aether-border p-2 flex justify-between items-center">
        <span className="text-[10px] text-aether-muted font-bold">{stagedCount} files staged</span>
        <button
          onClick={() => { if(msg.trim()) { onCommit(msg); setMsg(''); } }}
          disabled={!msg.trim() || stagedCount === 0}
          className="bg-aether-violet hover:bg-aether-violet/80 disabled:opacity-50 disabled:hover:bg-aether-violet text-white px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-colors"
        >
          Commit
        </button>
      </div>
    </div>
  )
}
