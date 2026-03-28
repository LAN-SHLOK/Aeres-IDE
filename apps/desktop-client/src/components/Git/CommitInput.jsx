import { useState } from 'react'
import { useStore } from '../../store.js'

export default function CommitInput({ commitMsg, setCommitMsg, handleCommit, disabled, stagedLength, loading }) {
  const [generating, setGenerating] = useState(false)
  const rootPath = useStore((s) => s.rootPath)

  const handleAutoGenerate = async () => {
    if (!rootPath || stagedLength === 0) return
    setGenerating(true)
    try {
      const e = window.electron
      const diff = await e.git.diff(rootPath, '', true) // get staged diff
      const token = await e.auth.getToken()
      
      const resp = await fetch(`${useStore.getState().backendUrl}/api/git/generate-commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ diff })
      })
      const data = await resp.json()
      if (data.message) {
        setCommitMsg(data.message.replace(/^"|"$/g, ''))
      }
    } catch (err) {
      console.error('Failed to generate commit', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="shrink-0 border-t border-aether-border bg-aether-surface p-2">
      <div className="relative">
        <textarea
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          placeholder="Commit message"
          rows={2}
          className="w-full resize-none rounded-md border border-aether-border bg-aether-bg px-2 py-1 pb-7 text-xs text-aether-text placeholder:text-aether-muted focus:border-aether-violet focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAutoGenerate}
          disabled={generating || stagedLength === 0}
          title="Auto-generate with AI"
          className="absolute bottom-2 right-2 flex items-center justify-center rounded text-aether-violet hover:bg-aether-violet/20 disabled:opacity-50 transition p-1"
        >
          {generating ? (
             <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          ) : (
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={handleCommit}
        disabled={disabled || loading}
        className="mt-1 w-full rounded-md bg-aether-violet py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {loading ? 'Committing…' : `Commit (${stagedLength} staged)`}
      </button>
    </div>
  )
}
