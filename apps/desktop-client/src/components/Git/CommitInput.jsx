import { useState } from 'react'
import { useStore } from '../../store.js'

export default function CommitInput({ onCommit, isLoading }) {
  const [message, setMessage] = useState('')
  const [amend, setAmend] = useState(false)
  const rootPath = useStore((s) => s.rootPath)

  const handleGenerateMessage = async () => {
    if (!window.electron?.git?.generateCommit) return
    try {
      const diff = await window.electron.git.diff(rootPath, null, true)
      if (!diff) return
      const result = await window.electron.git.generateCommit(diff)
      if (result?.message) setMessage(result.message)
    } catch (err) {
      console.error('[CommitInput] generate error:', err)
    }
  }

  const handleSubmit = () => {
    if (!message.trim() && !amend) return
    onCommit?.(message.trim(), amend)
    setMessage('')
    setAmend(false)
  }

  return (
    <div className="flex flex-col gap-2 p-3 border-t border-aeres-border bg-aeres-surface/30">
      <div className="relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message (Ctrl+Enter to commit)"
          rows={3}
          className="w-full resize-none rounded border border-aeres-border bg-aeres-bg px-2 py-1.5 text-[11px] text-aeres-text placeholder:text-aeres-muted/50 outline-none focus:border-aeres-violet transition-colors font-mono"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <button
          type="button"
          onClick={handleGenerateMessage}
          title="Generate commit message with AI"
          className="absolute top-1.5 right-1.5 p-1 rounded text-aeres-violet hover:bg-aeres-violet/10 transition"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-[10px] text-aeres-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={amend}
            onChange={(e) => setAmend(e.target.checked)}
            className="accent-violet-500"
          />
          Amend last commit
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || (!message.trim() && !amend)}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-aeres-violet text-white text-[10px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition"
        >
          {isLoading ? (
            <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
          Commit
        </button>
      </div>
    </div>
  )
}
