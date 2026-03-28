import { useStore } from '../../store.js'
import AetherLogo from '../AetherLogo.jsx'

export default function WelcomeScreen() {
  const rootPath = useStore((s) => s.rootPath)
  const setRootPath = useStore((s) => s.setRootPath)
  const setFileTree = useStore((s) => s.setFileTree)

  async function handleOpenFolder() {
    const e = window.electron
    if (!e) return
    const result = await e.fs.openFolder()
    if (!result) return
    const path = Array.isArray(result) ? result[0] : result
    if (!path) return
    setRootPath(path)
    const tree = await e.fs.getTree(path)
    setFileTree(tree)
  }

  const shortcuts = [
    { keys: 'Ctrl + P', label: 'Quick Open' },
    { keys: 'Ctrl + Shift + P', label: 'Command Palette' },
    { keys: 'Ctrl + `', label: 'Toggle Terminal' },
    { keys: 'Ctrl + Shift + M', label: 'Modernize Current File' },
    { keys: 'Ctrl + Shift + G', label: 'Source Control' },
  ]

  return (
    <div className="flex h-full flex-col items-center justify-center bg-aether-bg px-6 text-center font-body selection:bg-aether-violet/30 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-aether-violet/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mb-10 flex flex-col items-center">
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-aether-violet/20 blur-[40px] rounded-full" />
          <AetherLogo size={80} className="relative" />
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white mb-2">
          Aether <span className="bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] bg-clip-text text-transparent">IDE</span>
        </h1>
        <p className="text-xs text-white/30 uppercase tracking-[0.3em] font-medium font-mono">
          Code at the speed of thought
        </p>
      </div>

      <div className="relative z-10 mb-10 flex flex-col items-center gap-3">
        <button
          onClick={handleOpenFolder}
          className="group relative rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-10 py-3.5 text-sm font-semibold text-white shadow-lg shadow-aether-violet/30 transition-all hover:shadow-aether-violet/50 hover:scale-[1.03] active:scale-[0.98]"
        >
          <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-all" />
          <span className="relative flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Open Folder
          </span>
        </button>
        {rootPath && (
          <p className="text-xs text-white/30 font-mono">
            Active: <span className="text-aether-violet/80">{rootPath.split(/[/\\]/).pop()}</span>
          </p>
        )}
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(124,58,237,0.15)]">
        <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/25 font-mono">
          Keyboard Shortcuts
        </h2>
        <div className="flex flex-col gap-3.5">
          {shortcuts.map((s) => (
            <div key={s.label} className="flex items-center justify-between text-xs group">
              <span className="text-white/40 group-hover:text-white/60 transition-colors">{s.label}</span>
              <span className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 font-mono text-[10px] text-aether-violet/70 group-hover:text-aether-violet group-hover:border-aether-violet/20 transition-all">
                {s.keys}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Version tag */}
      <p className="relative z-10 mt-8 text-[9px] font-mono text-white/15 tracking-widest uppercase">
        v1.0.4 // Neural Engine Ready
      </p>
    </div>
  )
}
