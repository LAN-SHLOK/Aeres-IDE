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
  const [error, setError] = useState(null)
  
  const [isGitRepo, setIsGitRepo] = useState(true)
  const [initing, setIniting] = useState(false)
  const [successModal, setSuccessModal] = useState(null)

  const [branchesInfo, setBranchesInfo] = useState({ current: '', local: [] })
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [creatingBranch, setCreatingBranch] = useState(false)

  const fetchBranches = useCallback(async () => {
    if (!rootPath || !window.electron) return
    try {
      const info = await window.electron.git.branches(rootPath)
      setBranchesInfo(info)
    } catch (err) {
      console.error('[GitPanel] Error fetching branches:', err)
    }
  }, [rootPath])

  useEffect(() => {
    fetchBranches()
  }, [rootPath, gitStatus.branch, fetchBranches])

  const [commitLog, setCommitLog] = useState([])

  const fetchCommitLog = useCallback(async () => {
    if (!rootPath || !window.electron) return
    try {
      const log = await window.electron.git.log(rootPath, 30)
      setCommitLog(log)
    } catch (err) {
      console.error('[GitPanel] Error fetching log:', err)
    }
  }, [rootPath])

  useEffect(() => {
    fetchCommitLog()
  }, [rootPath, gitStatus, fetchCommitLog])

  // Poll git status
  useEffect(() => {
    if (!rootPath) return
    const poll = async () => {
      const e = window.electron
      if (!e) return
      try {
        const status = await e.git.status(rootPath)
        setGitStatus(status)
        setIsGitRepo(true)
      } catch (err) {
        if (err.message && err.message.includes('not a git repository')) {
          setIsGitRepo(false)
        }
      }
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [rootPath, setGitStatus])

  const handleInit = async () => {
    if (!window.electron || !rootPath) return
    setIniting(true)
    setError(null)
    try {
      const res = await window.electron.git.init(rootPath)
      if (res?.success) {
        setIsGitRepo(true)
        const status = await window.electron.git.status(rootPath)
        setGitStatus(status)
      } else {
        setError(res?.error || 'Failed to initialize repository')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIniting(false)
    }
  }

  if (!rootPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-aeres-muted">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        <span className="text-xs">No project opened yet</span>
      </div>
    )
  }

  if (!isGitRepo) {
    return (
      <div className="flex h-full flex-col justify-between bg-[#0a0a0f] p-4 animate-in fade-in duration-300">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-violet-600/10 blur-xl rounded-full" />
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full border border-slate-800 bg-slate-900/80 text-slate-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 15V9a4 4 0 0 0-4-4H9"/><line x1="6" y1="9" x2="6" y2="15"/></svg>
            </div>
          </div>
          
          <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase mb-1">Source Control</h3>
          <p className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed mb-4">
            This workspace folder is not currently a Git repository. Initialize Git to start tracking file changes.
          </p>

          {error && (
            <div className="w-full mb-3 p-2 rounded bg-red-950/20 border border-red-900/30 text-red-400 text-[10px] text-left leading-normal">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleInit}
            disabled={initing}
            className="px-4 py-1.5 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white font-medium text-xs rounded-sm transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-[180px]"
          >
            {initing ? 'Initializing...' : 'Initialize Repository'}
          </button>
        </div>
      </div>
    )
  }

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
    setError(null)
    try {
      const res = await e.git.commit(rootPath, commitMsg)
      if (!res?.success) {
        setError(res?.error || 'Commit failed')
        return
      }
      setSuccessModal({
        emoji: '📦',
        title: 'Commit Created!',
        message: `Successfully committed staged changes to branch:\n"${gitStatus.branch || 'main'}"`
      })
      setCommitMsg('')
      const status = await e.git.status(rootPath)
      setGitStatus(status)
    } catch (err) {
      setError(err.message)
      console.error('[GitPanel] commit error:', err)
    } finally {
      setLoading((l) => ({ ...l, commit: false }))
    }
  }, [commitMsg, staged.length, rootPath, setGitStatus, gitStatus.branch])

  const [gitAuth, setGitAuth] = useState(null)

  const handleAction = useCallback(async (action) => {
    const e = window.electron
    if (!e || !rootPath) return
    const store = useStore.getState()
    const taskMsg = action.charAt(0).toUpperCase() + action.slice(1) + 'ing...'
    store.setGitTask(taskMsg)
    setLoading((l) => ({ ...l, [action]: true }))
    setError(null)
    try {
      let res
      if (action === 'push') {
        res = await e.git.push(rootPath, false, gitAuth)
      } else if (action === 'pull') {
        res = await e.git.pull(rootPath, gitAuth)
      } else {
        res = await e.git[action](rootPath)
      }

      if (!res?.success) {
        const errorMsg = res?.error || ''
        if (
          errorMsg.includes('Authentication failed') ||
          errorMsg.includes('could not read Username') ||
          errorMsg.includes('terminal prompts disabled') ||
          errorMsg.includes('Authorization') ||
          errorMsg.includes('Not Found') ||
          errorMsg.includes('credentials')
        ) {
          const username = window.prompt('Aeres Git Authentication:\nEnter your Git/GitHub Username:')
          if (username) {
            const token = window.prompt('Enter your Personal Access Token (PAT) or Password:')
            if (token) {
              const newAuth = { username, token }
              setGitAuth(newAuth)
              
              store.setGitTask(`Retrying ${action}...`)
              let retryRes
              if (action === 'push') {
                retryRes = await e.git.push(rootPath, false, newAuth)
              } else if (action === 'pull') {
                retryRes = await e.git.pull(rootPath, newAuth)
              } else {
                retryRes = await e.git[action](rootPath)
              }

              if (!retryRes?.success) {
                setError(retryRes.error || `${action} failed on retry`)
              } else {
                let modalDetails = { emoji: '✅', title: 'Git Action Complete!', message: 'Operation completed successfully.' }
                if (action === 'push') {
                  modalDetails = {
                    emoji: '🚀',
                    title: 'Git Push Successful!',
                    message: `Successfully pushed active branch "${gitStatus.branch || 'main'}" to remote repository: "origin" (GitHub).`
                  }
                } else if (action === 'pull') {
                  modalDetails = {
                    emoji: '🔄',
                    title: 'Git Pull Successful!',
                    message: `Successfully pulled new updates for branch "${gitStatus.branch || 'main'}" from remote repository: "origin" (GitHub).`
                  }
                } else if (action === 'fetch') {
                  modalDetails = {
                    emoji: '📡',
                    title: 'Git Fetch Successful!',
                    message: `Successfully fetched latest changes and branches from remote repository: "origin" (GitHub).`
                  }
                }
                setSuccessModal(modalDetails)

                const status = await e.git.status(rootPath)
                setGitStatus(status)
              }
              return
            }
          }
        }
        setError(res?.error || `${action} failed`)
        return
      }

      // Action succeeded on first try
      let modalDetails = { emoji: '✅', title: 'Git Action Complete!', message: 'Operation completed successfully.' }
      if (action === 'push') {
        modalDetails = {
          emoji: '🚀',
          title: 'Git Push Successful!',
          message: `Successfully pushed active branch "${gitStatus.branch || 'main'}" to remote repository: "origin" (GitHub).`
        }
      } else if (action === 'pull') {
        modalDetails = {
          emoji: '🔄',
          title: 'Git Pull Successful!',
          message: `Successfully pulled new updates for branch "${gitStatus.branch || 'main'}" from remote repository: "origin" (GitHub).`
        }
      } else if (action === 'fetch') {
        modalDetails = {
          emoji: '📡',
          title: 'Git Fetch Successful!',
          message: `Successfully fetched latest changes and branches from remote repository: "origin" (GitHub).`
        }
      }
      setSuccessModal(modalDetails)

      const status = await e.git.status(rootPath)
      setGitStatus(status)
    } catch (err) {
      setError(err.message)
      console.error(`[GitPanel] ${action} error:`, err)
    } finally {
      setLoading((l) => ({ ...l, [action]: false }))
      store.setGitTask(null)
    }
  }, [rootPath, setGitStatus, gitAuth, gitStatus.branch])

  if (!rootPath) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-aeres-muted px-4 text-center">
        Open a folder to use source control
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-aeres-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-aeres-muted">
          Source Control
        </span>
        <div className="flex gap-1">
          {['fetch', 'pull', 'push'].map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleAction(action)}
              disabled={loading[action]}
              className="rounded px-1.5 py-0.5 text-[10px] capitalize text-aeres-muted transition hover:text-aeres-violet disabled:opacity-40"
            >
              {loading[action] ? (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              ) : action}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-950/40 border-b border-red-900/50 p-3 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400 mt-0.5 shrink-0"><path d="M12 9v2M12 15h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/></svg>
          <div className="flex-1 text-[10px] text-red-200 leading-relaxed font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Branch */}
        <div className="relative border-b border-aeres-border bg-aeres-surface/20">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => {
                setShowBranchDropdown(!showBranchDropdown)
                fetchBranches()
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-aeres-violet transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aeres-muted"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
              <span>{gitStatus.branch || 'unknown'}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`opacity-60 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button
              onClick={() => setCreatingBranch(!creatingBranch)}
              title="Create New Branch"
              className="text-aeres-muted hover:text-aeres-violet p-0.5 rounded transition cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>

          {/* Create Branch Panel */}
          {creatingBranch && (
            <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/40 flex gap-2 animate-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="New branch name..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-aeres-violet"
              />
              <button
                onClick={async () => {
                  if (!newBranchName.trim()) return
                  try {
                    await window.electron.git.createBranch(rootPath, newBranchName.trim(), true)
                    setNewBranchName('')
                    setCreatingBranch(false)
                    // Refresh branch name & list
                    const status = await window.electron.git.status(rootPath)
                    setGitStatus(status)
                    fetchBranches()
                  } catch (err) {
                    setError(err.message)
                  }
                }}
                className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white text-[10px] rounded font-medium transition cursor-pointer"
              >
                Create
              </button>
            </div>
          )}

          {/* Branches Dropdown List */}
          {showBranchDropdown && (
            <div className="absolute left-0 right-0 top-full bg-slate-900/95 border-b border-aeres-border shadow-2xl z-20 max-h-48 overflow-y-auto animate-in fade-in duration-150">
              <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800/40">Local Branches</div>
              {branchesInfo.local.map((b) => {
                const isCurrent = b === gitStatus.branch
                return (
                  <div
                    key={b}
                    onClick={async () => {
                      if (isCurrent) return
                      try {
                        await window.electron.git.switchBranch(rootPath, b)
                        const status = await window.electron.git.status(rootPath)
                        setGitStatus(status)
                        setShowBranchDropdown(false)
                        fetchBranches()
                      } catch (err) {
                        setError(err.message)
                      }
                    }}
                    className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                      isCurrent ? 'bg-violet-950/40 text-violet-400 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{b}</span>
                    {isCurrent && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-violet-400"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
          <div className="border-t border-aeres-border bg-aeres-bg p-2">
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
                      ? 'text-aeres-blue'
                      : 'text-aeres-muted'
                  }
                >
                  {line}
                </div>
              ))}
            </pre>
          </div>
        )}
        {/* Commit History Timeline */}
        {commitLog.length > 0 && (
          <div className="border-t border-aeres-border bg-slate-950/20 px-3 py-3 shrink-0">
            <div className="flex items-center gap-1.5 mb-3">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-aeres-muted"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-aeres-muted">Commit History</span>
            </div>

            <div className="relative pl-6 flex flex-col gap-4">
              {/* Vertical line */}
              <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 bg-slate-800" />

              {commitLog.map((commit, idx) => {
                const isLatest = idx === 0
                // Simple heuristics to attach tags to commits
                const hasLocalTag = isLatest
                const hasRemoteTag = isLatest && !loading.push
                
                return (
                  <div key={commit.hash} className="relative flex flex-col gap-1 text-xs">
                    {/* Timeline Node dot */}
                    <div className={`absolute -left-[18.5px] top-1.5 w-2 h-2 rounded-full border-2 bg-slate-950 z-10 transition-all ${
                      isLatest ? 'border-amber-500 scale-110 shadow-lg shadow-amber-500/20' : 'border-blue-500'
                    }`} />

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-slate-200 select-all hover:text-white transition-colors">{commit.subject}</span>
                      
                      {/* Local Branch Badge */}
                      {hasLocalTag && (
                        <span className="inline-flex items-center gap-0.5 bg-blue-950/60 text-blue-400 border border-blue-900/40 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                          {gitStatus.branch || 'main'}
                        </span>
                      )}

                      {/* Remote Branch Badge */}
                      {hasRemoteTag && (
                        <span className="inline-flex items-center gap-0.5 bg-amber-950/60 text-amber-400 border border-amber-900/40 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 10a6 6 0 0 0-12 0A5 5 0 0 0 7 20h11a5 5 0 0 0 0-10z"/></svg>
                          origin/{gitStatus.branch || 'main'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span className="text-slate-400">{commit.author}</span>
                      <span>•</span>
                      <span>{commit.hash}</span>
                    </div>
                  </div>
                )
              })}
            </div>
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

      {successModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-[#7C3AED]/40 rounded-xl p-4 w-full max-w-[250px] text-center shadow-2xl shadow-[#7C3AED]/20 animate-in zoom-in-95 duration-200">
            <div className="text-3xl mb-2">{successModal.emoji}</div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">{successModal.title}</h4>
            <p className="text-[10px] text-slate-300 leading-relaxed mb-4 whitespace-pre-line">{successModal.message}</p>
            <button
              onClick={() => setSuccessModal(null)}
              className="w-full py-1.5 bg-[#7C3AED] hover:bg-[#7C3AED]/80 text-white font-bold text-[10px] rounded transition-all active:scale-95 uppercase tracking-wide cursor-pointer"
            >
              Awesome
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="px-3 py-1 text-[10px] font-semibold text-aeres-muted">{title}</div>
      {children}
    </div>
  )
}

function FileRow({ file, color, actionIcon, actionTitle, onAction, onClick }) {
  const name = file.path.split(/[/\\]/).pop()
  return (
    <div className="group flex cursor-pointer items-center gap-1 px-3 py-0.5 text-xs transition hover:bg-white/5" onClick={onClick}>
      <span className={`min-w-0 flex-1 truncate ${color}`}>{name}</span>
      <span className="text-[9px] text-aeres-muted truncate max-w-[100px]">{file.path}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAction() }}
        title={actionTitle}
        className="ml-1 hidden h-5 w-5 items-center justify-center rounded text-sm text-aeres-muted hover:text-aeres-violet group-hover:flex"
      >
        {actionIcon}
      </button>
    </div>
  )
}
