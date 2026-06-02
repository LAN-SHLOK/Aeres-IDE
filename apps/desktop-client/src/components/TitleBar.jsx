import { useStore } from '../store.js'

export default function TitleBar() {
  const theme = useStore((s) => s.theme)
  const authStatus = useStore((s) => s.authStatus)
  const isCutie = theme?.startsWith('cutie')

  const handleMinimize = () => {
    if (window.electron?.window?.minimize) {
      window.electron.window.minimize()
    } else {
      console.warn('Minimize not supported in this environment')
    }
  }

  const handleMaximize = () => {
    if (window.electron?.window?.maximize) {
      window.electron.window.maximize()
    } else {
      console.warn('Maximize not supported in this environment')
    }
  }

  const handleClose = () => {
    if (window.electron?.window?.close) {
      window.electron.window.close()
    } else {
      window.close()
    }
  }

  const handleNewWindow = () => {
    window.electron?.window?.newWindow()
  }

  return (
    <div 
      className={`h-10 w-full flex items-center justify-between select-none z-[100] ${
        isCutie 
          ? 'bg-gradient-to-r from-[#ffb3c1]/10 to-[#d8b4fe]/10 border-b-3 border-black' 
          : 'bg-transparent border-b border-slate-800/50'
      }`}
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: macOS Traffic Light Spacer or Cute Candy Circles */}
      <div className="w-20 flex items-center gap-1.5 pl-4" style={{ WebkitAppRegion: 'no-drag' }}>
        {isCutie && !window.electron?.isMac ? (
          <>
            <button onClick={handleClose} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black shadow-[2px_2px_0px_#000] focus:outline-none transition-transform hover:scale-110 active:translate-y-[1px]" title="Close" />
            <button onClick={handleMinimize} className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black shadow-[2px_2px_0px_#000] focus:outline-none transition-transform hover:scale-110 active:translate-y-[1px]" title="Minimize" />
            <button onClick={handleMaximize} className="w-3 h-3 rounded-full bg-[#27c93f] border border-black shadow-[2px_2px_0px_#000] focus:outline-none transition-transform hover:scale-110 active:translate-y-[1px]" title="Maximize" />
          </>
        ) : (
          <div className="w-20" />
        )}
      </div>
      
      {/* Center: Sleek Command Palette Search */}
      <div className="flex-1 flex justify-center px-4">
        <div 
          className={`w-full max-w-[450px] px-3 py-1 flex items-center gap-2 group transition-all cursor-pointer ${
            isCutie 
              ? 'bg-[#fffdf9] border-2 border-black rounded-full shadow-[2px_2px_0px_#000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[3px_3px_0px_#000]' 
              : 'bg-slate-900/40 border border-slate-700/30 rounded-md hover:bg-slate-900/60 hover:border-slate-600/50'
          }`}
          style={{ WebkitAppRegion: 'no-drag' }}
          onClick={() => useStore.getState().setQuickOpenOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isCutie ? "text-black" : "text-slate-500 group-hover:text-slate-300 transition-colors"}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className={`text-xs font-semibold tracking-tight truncate ${isCutie ? 'text-black/80' : 'text-slate-500'}`}>
            🌸 Search files, symbols, or ask AI...
          </span>
          <div className="ml-auto flex items-center gap-1 opacity-70">
             <span className={`px-1.5 py-0.5 rounded border text-[10px] ${isCutie ? 'border-black bg-[#ffb3c1]/30 text-black' : 'border-slate-700 bg-slate-800'}`}>Ctrl</span>
             <span className={`px-1.5 py-0.5 rounded border text-[10px] ${isCutie ? 'border-black bg-[#ffb3c1]/30 text-black' : 'border-slate-700 bg-slate-800'}`}>P</span>
          </div>
        </div>
      </div>
      
      {/* Right: New Window button + Window Controls */}
      <div 
        className="flex items-center h-full pr-2 gap-1"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {/* User Profile & Logout */}
        {authStatus?.authenticated && (
          <div className={`flex items-center gap-2 px-2 py-1 mx-1 rounded ${isCutie ? 'bg-[#ffb3c1]/20 border border-[#ffb3c1]/50' : 'bg-slate-800/50 border border-slate-700/50'}`}>
            <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${isCutie ? 'bg-white text-black' : 'bg-slate-700 text-white'}`}>
              {(authStatus.email || 'U')[0].toUpperCase()}
            </div>
            <span className={`text-[10px] truncate max-w-[120px] ${isCutie ? 'text-black/80 font-medium' : 'text-slate-300'}`}>
              {authStatus.email}
            </span>
            <div className={`w-px h-3 mx-1 ${isCutie ? 'bg-black/20' : 'bg-slate-700'}`} />
            <button
              onClick={async () => {
                if (window.electron?.auth?.logout) {
                  await window.electron.auth.logout();
                  useStore.getState().setAuthStatus({ authenticated: false, email: null });
                }
              }}
              title="Sign Out"
              className={`flex items-center justify-center rounded transition-colors ${
                isCutie
                  ? 'hover:bg-black/5 text-black/60 hover:text-black'
                  : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}

        {/* New Window button — always visible for easy multi-project access */}
        <button
          onClick={handleNewWindow}
          title="New Window (Ctrl+Shift+N)"
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            isCutie
              ? 'hover:bg-black/5 text-black/60 hover:text-black'
              : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="13" height="13" rx="1"/>
            <path d="M8 21h13a1 1 0 0 0 1-1V8"/>
          </svg>
        </button>

        {!window.electron?.isMac && (
          <>
            <button 
              onClick={handleMinimize}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                isCutie
                  ? 'hover:bg-black/5 text-black/60 hover:text-black'
                  : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              <svg width="12" height="1" viewBox="0 0 12 1" fill="currentColor"><rect width="12" height="1"/></svg>
            </button>
            <button 
              onClick={handleMaximize}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                isCutie
                  ? 'hover:bg-black/5 text-black/60 hover:text-black'
                  : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
            </button>
            <button 
              onClick={handleClose}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                isCutie
                  ? 'hover:bg-red-500 hover:text-white text-black/60 hover:text-black'
                  : 'hover:bg-red-500/80 text-slate-500 hover:text-white'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1l10 10M11 1L1 11"/></svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
