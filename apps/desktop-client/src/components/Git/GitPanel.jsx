import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../../store.js'
import CommitInput from './CommitInput.jsx'

export default function GitPanel() {
  const rootPath = useStore((s) => s.rootPath)
  const gitStatus = useStore((s) => s.gitStatus)
  const setGitStatus = useStore((s) => s.setGitStatus)

  const [commitMsg, setCommitMsg] = useState('')
  const [diffContent, setDiffContent] = useState('')
  const [diffFile, setDiffFile] = useState(null)
  const [loading, setLoading] = useState({})

  // Poll git status
  useEffect(() => {
    if (!rootPath) return
    const poll = async () => {
      const e = window.electron
      if (!e) return
      try {
        const status = await e.git.status(rootPath)
        setGitStatus(status)
      } catch { /* ok */ }
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [rootPath, setGitStatus])

  const staged = (gitStatus.files || []).filter((f) => f.x !== ' ' && f.x !== '?')
  const changes = (gitStatus.files || []).filter((f) => f.y !== ' ' && f.y !== '?' && f.x !== 'A')
  const untracked = (gitStatus.files || []).filter((f) => f.x === '?')

  const handleStage = useCallback(async (filePaths) => {
    const e = window.electron
    if (!e || !rootPath) return
    await e.git.stage(rootPath, Array.isArray(filePaths) ? filePaths : [filePaths])
    const status = await e.git.status(rootPath)
    setGitStatus(status)
  }, [rootPath, setGitStatus])

  const handleUnstage = useCallback(async (filePaths) => {
    const e = window.electron
    if (!e || !rootPath) return
    await e.git.unstage(rootPath, Array.isArray(filePaths) ? filePaths : [filePaths])
    const status = await e.git.status(rootPath)
    setGitStatus(status)
  }, [rootPath, setGitStatus])

  const handleDiff = useCallback(async (filePath, isStagedDiff) => {
    const e = window.electron
    if (!e || !rootPath) return
    if (diffFile === filePath) { setDiffFile(null); setDiffContent(''); return }
    const diff = await e.git.diff(rootPath, filePath, isStagedDiff)
    setDiffContent(diff || 'No changes')
    setDiffFile(filePath)
  }, [rootPath, diffFile])

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim() || staged.length === 0) return
    const e = window.electron
    if (!e || !rootPath) return
    setLoading((l) => ({ ...l, commit: true }))
    try {
      await e.git.commit(rootPath, commitMsg)
      setCommitMsg('')
      const status = await e.git.status(rootPath)
      setGitStatus(status)
    } catch (err) {
      console.error('[GitPanel] commit error:', err)
    } finally {
      setLoading((l) => ({ ...l, commit: false }))
    }
  }, [commitMsg, staged.length, rootPath, setGitStatus])

  const handleAction = useCallback(async (action) => {
    const e = window.electron
    if (!e || !rootPath) return
    setLoading((l) => ({ ...l, [action]: true }))
    try {
      await e.git[action](rootPath)
      const status = await e.git.status(rootPath)
      setGitStatus(status)
    } catch (err) {
      console.error(`[GitPanel] ${action} error:`, err)
    } finally {
      setLoading((l) => ({ ...l, [action]: false }))
    }
  }, [rootPath, setGitStatus])

  if (!rootPath) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-aether-muted px-4 text-center">
        Open a folder to use source control
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-aether-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-aether-muted">
          Source Control
        </span>
        <div className="flex gap-1">
          {['fetch', 'pull', 'push'].map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleAction(action)}
              disabled={loading[action]}
              className="rounded px-1.5 py-0.5 text-[10px] capitalize text-aether-muted transition hover:text-aether-violet disabled:opacity-40"
            >
              {loading[action] ? (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              ) : action}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Branch */}
        <div className="flex items-center gap-1.5 border-b border-aether-border px-3 py-2 bg-aether-surface/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aether-muted"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
          <span className="text-xs font-medium text-white/80">{gitStatus.branch || 'unknown'}</span>
        </div>

        {/* Staged */}
        <Section title={`Staged (${staged.length})`}>
          {staged.map((f) => (
            <FileRow
              key={f.path}
              file={f}
              color="text-green-400"
              actionIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>}
              actionTitle="Unstage"
              onAction={() => handleUnstage(f.path)}
              onClick={() => handleDiff(f.path, true)}
              isExpanded={diffFile === f.path}
            />
          ))}
        </Section>

        {/* Changes */}
        <Section title={`Changes (${changes.length})`}>
          {changes.map((f) => (
            <FileRow
              key={f.path}
              file={f}
              color="text-amber-400"
              actionIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
              actionTitle="Stage"
              onAction={() => handleStage(f.path)}
              onClick={() => handleDiff(f.path, false)}
              isExpanded={diffFile === f.path}
            />
          ))}
        </Section>

        {/* Untracked */}
        <Section title={`Untracked (${untracked.length})`}>
          {untracked.map((f) => (
            <FileRow
              key={f.path}
              file={f}
              color="text-red-400"
              actionIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
              actionTitle="Stage"
              onAction={() => handleStage(f.path)}
              onClick={() => {}}
            />
          ))}
        </Section>

        {/* Diff preview */}
        {diffFile && diffContent && (
          <div className="border-t border-aether-border bg-aether-bg p-2">
            <pre className="max-h-40 overflow-auto text-[10px] leading-relaxed">
              {diffContent.split('\n').map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith('+') && !line.startsWith('+++')
                      ? 'text-green-400'
                      : line.startsWith('-') && !line.startsWith('---')
                      ? 'text-red-400'
                      : line.startsWith('@@')
                      ? 'text-aether-blue'
                      : 'text-aether-muted'
                  }
                >
                  {line}
                </div>
              ))}
            </pre>
          </div>
        )}
      </div>

      {/* Commit panel */}
      <CommitInput
        commitMsg={commitMsg}
        setCommitMsg={setCommitMsg}
        handleCommit={handleCommit}
        disabled={!commitMsg.trim() || staged.length === 0 || loading.commit}
        stagedLength={staged.length}
        loading={loading.commit}
      />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="px-3 py-1 text-[10px] font-semibold text-aether-muted">{title}</div>
      {children}
    </div>
  )
}

function FileRow({ file, color, actionIcon, actionTitle, onAction, onClick }) {
  const name = file.path.split(/[/\\]/).pop()
  return (
    <div className="group flex cursor-pointer items-center gap-1 px-3 py-0.5 text-xs transition hover:bg-white/5" onClick={onClick}>
      <span className={`min-w-0 flex-1 truncate ${color}`}>{name}</span>
      <span className="text-[9px] text-aether-muted truncate max-w-[100px]">{file.path}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAction() }}
        title={actionTitle}
        className="ml-1 hidden h-5 w-5 items-center justify-center rounded text-sm text-aether-muted hover:text-aether-violet group-hover:flex"
      >
        {actionIcon}
      </button>
    </div>
  )
}
