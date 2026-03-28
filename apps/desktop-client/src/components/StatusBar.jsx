import { useStore } from '../store.js'

export default function StatusBar() {
  const gitStatus = useStore((s) => s.gitStatus)
  const authStatus = useStore((s) => s.authStatus)
  const backendUrl = useStore((s) => s.backendUrl)
  const diagnostics = useStore((s) => s.diagnostics)
  const currentSessionName = useStore((s) => s.currentSessionName)

  // Count errors and warnings
  const allDiags = Object.values(diagnostics).flat()
  const errorCount = allDiags.filter((d) => (d?.severity || '').toLowerCase() === 'error').length
  const warningCount = allDiags.filter((d) => (d?.severity || '').toLowerCase() === 'warning').length

  return (
    <div className="flex h-[26px] shrink-0 items-center justify-between bg-gradient-to-r from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] px-3 text-[11px] font-medium text-white/90 shadow-[0_-1px_10px_rgba(124,58,237,0.2)]">
      {/* Left */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity cursor-default">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
          <span className="font-mono text-[10px]">{gitStatus.branch || 'main'}</span>
        </span>
        {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
          <div className="flex items-center gap-2 text-white/70 font-mono text-[10px]">
            {gitStatus.ahead > 0 && (
              <span className="flex items-center gap-0.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                {gitStatus.ahead}
              </span>
            )}
            {gitStatus.behind > 0 && (
              <span className="flex items-center gap-0.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                {gitStatus.behind}
              </span>
            )}
          </div>
        )}
        {currentSessionName && (
          <span className="flex items-center gap-1 text-white/70 font-mono text-[10px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
            {currentSessionName}
          </span>
        )}
      </div>

      {/* Center */}
      <div className="flex items-center gap-3">
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-red-200 font-mono text-[10px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {errorCount}
          </span>
        )}
        {warningCount > 0 && (
          <span className="flex items-center gap-1 text-amber-200 font-mono text-[10px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {warningCount}
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 font-mono text-[10px]">
        <span className="text-white/60">{authStatus.email || ''}</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${backendUrl ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'}`}
          />
          <span className="text-white/70">{backendUrl ? 'Engine Ready' : 'Engine Offline'}</span>
        </span>
      </div>
    </div>
  )
}

