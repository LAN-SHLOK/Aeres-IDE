import { useStore } from '../../store.js'

export default function DebugToolbar() {
  // Fixed: was incorrectly reading s.debugStatus — the store field is s.debugState
  const debugState = useStore((s) => s.debugState)
  const debugSession = useStore((s) => s.debugSession)

  if (!debugSession) return null

  const handleStop = () => window.electron?.debug?.stop(debugSession)
  const handleContinue = () => window.electron?.debug?.continue()
  const handleStepOver = () => window.electron?.debug?.stepOver()
  const handleStepInto = () => window.electron?.debug?.stepInto()
  const handleStepOut = () => window.electron?.debug?.stepOut()

  const handleRestart = async () => {
    if (!window.electron) return
    // Stop current session then re-launch the same file
    const store = useStore.getState()
    const activeTab = store.tabs.find((t) => t.id === store.activeTabId)
    await window.electron.debug.stop(debugSession)
    if (activeTab) {
      await window.electron.debug.launch({ filePath: activeTab.path, cwd: store.rootPath })
    }
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[5000] flex items-center gap-1 p-1 bg-[#252526] border border-[#454545] rounded shadow-2xl">
      <div className="flex items-center px-2 cursor-move border-r border-[#454545] mr-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
          <circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
        </svg>
      </div>

      <button onClick={handleContinue} className="p-1.5 text-green-500 hover:bg-white/10 rounded transition" title="Continue (F5)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
      </button>

      <button onClick={handleStepOver} className="p-1.5 text-blue-400 hover:bg-white/10 rounded transition" title="Step Over (F10)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="M2 7v10"/>
        </svg>
      </button>

      <button onClick={handleStepInto} className="p-1.5 text-blue-400 hover:bg-white/10 rounded transition" title="Step Into (F11)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m11 19 4-4-4-4"/><path d="M15 15H3"/><path d="M21 5v14"/>
        </svg>
      </button>

      <button onClick={handleStepOut} className="p-1.5 text-blue-400 hover:bg-white/10 rounded transition" title="Step Out (Shift+F11)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m13 5-4 4 4 4"/><path d="M9 9h12"/><path d="M3 5v14"/>
        </svg>
      </button>

      {/* Fixed: Restart button now has an onClick handler */}
      <button onClick={handleRestart} className="p-1.5 text-orange-400 hover:bg-white/10 rounded transition" title="Restart (Ctrl+Shift+F5)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
        </svg>
      </button>

      <button onClick={handleStop} className="p-1.5 text-red-500 hover:bg-white/10 rounded transition" title="Stop (Shift+F5)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
      </button>

      {/* Debug state indicator */}
      {debugState && debugState !== 'idle' && (
        <div className="ml-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-[#454545] text-slate-400">
          {debugState}
        </div>
      )}
    </div>
  )
}
