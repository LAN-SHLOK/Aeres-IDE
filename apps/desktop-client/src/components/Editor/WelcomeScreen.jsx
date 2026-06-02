import { useStore } from '../../store.js'
import { openFolderAndResetTerminals } from '../../utils/workspaceActions.js'
import { Flower, Sparkles, Cat, Heart } from 'lucide-react'

export default function WelcomeScreen() {
  const rootPath = useStore((s) => s.rootPath)

  async function handleOpenFolder() {
    await openFolderAndResetTerminals()
  }

  const shortcuts = [
    { keys: 'Ctrl + P', label: 'Go to File' },
    { keys: 'Ctrl + Shift + P', label: 'Show All Commands' },
    { keys: 'Ctrl + `', label: 'Toggle Terminal' },
    { keys: 'Ctrl + Shift + G', label: 'Show Source Control' },
    { keys: 'Ctrl + Shift + D', label: 'Show Run and Debug' },
  ]

  const theme = useStore((s) => s.theme)
  const isCutie = theme?.startsWith('cutie') || theme === 'aeres'

  if (isCutie) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-aeres-bg px-6 text-aeres-text select-none">
        <div className="flex flex-col items-center max-w-sm w-full">
          
          {/* Retro Y2K Window Card */}
          <div className="w-full bg-[#fffdf9] border-3 border-black rounded-2xl shadow-[2px_2px_0px_#000] overflow-hidden text-black">
            
            {/* Window Header */}
            <div className="h-8 flex items-center justify-between border-b-3 border-black px-3"
                 style={{
                   backgroundSize: '16px 16px',
                   backgroundImage: 'linear-gradient(to right, rgba(255, 179, 193, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 179, 193, 0.15) 1px, transparent 1px)',
                   backgroundColor: theme === 'cutie-dark' ? '#ffb3c1' : '#ff8ba7'
                 }}>
              <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Flower size={12} className="text-pink-500" /> Aeres Cutie OS v1.0
              </span>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-black" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-black" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-black" />
              </div>
            </div>
            
            {/* Window Content */}
            <div className="p-5 space-y-5 flex flex-col items-center text-center">
              
              <div className="text-4xl animate-bounce duration-1000 my-1 flex justify-center items-center gap-2 text-pink-500">
                <Cat size={36} />
                <Sparkles size={36} />
              </div>
              
              <div>
                <h1 className="text-xl font-black text-black tracking-tight mb-1 font-mono">Welcome, Cute Coder!</h1>
                <p className="text-[11px] text-black/70 max-w-xs mx-auto leading-relaxed flex items-center justify-center gap-1 mt-1">
                  Let's write beautiful, error-free code today with absolute zero eye strain! <Heart size={12} className="text-pink-500 fill-current" />
                </p>
              </div>

              <div className="w-full space-y-4">
                <button
                  onClick={handleOpenFolder}
                  className="w-full py-2 bg-[#a7f3d0] border-2.5 border-black rounded-full shadow-[2px_2px_0px_#000] font-black text-xs uppercase tracking-wider hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  Open Folder
                </button>
                <button
                  onClick={() => window.electron?.window?.newWindow()}
                  className="w-full py-2 bg-[#c4b5fd]/30 border-2 border-black rounded-full shadow-[2px_2px_0px_#000] font-black text-xs uppercase tracking-wider hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center gap-2 text-black/70"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="13" height="13" rx="1"/>
                    <path d="M8 21h13a1 1 0 0 0 1-1V8"/>
                  </svg>
                  New Window
                </button>
              </div>

              <div className="w-full pt-4 border-t-2 border-dashed border-black/20 text-left">
                <span className="text-[9px] font-black uppercase text-black/50 tracking-wider mb-2.5 block">Quick Shortcuts:</span>
                <div className="space-y-2">
                  {shortcuts.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-black/60">{s.label}</span>
                      <div className="flex gap-1">
                        {s.keys.split(' + ').map(key => (
                          <kbd key={key} className="px-1.5 py-0.5 rounded border border-black bg-[#ffb3c1]/20 font-sans text-[8px] font-bold text-black">
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
          
          <div className="mt-6 text-[8px] font-black tracking-widest uppercase opacity-45 text-slate-500 flex items-center justify-center gap-1.5">
            <Heart size={10} className="text-pink-500" /> SYSTEM IS SO COZY RIGHT NOW <Heart size={10} className="text-pink-500" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-aeres-bg px-6 text-aeres-text select-none">
      <div className="flex flex-col items-center max-w-lg w-full">
        {/* Subtle logo or just text */}
        <div className="mb-12 opacity-10">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>

        <div className="w-full space-y-8">
          <div>
            <h1 className="text-3xl font-light text-white/90 mb-6">Aeres IDE</h1>
            <div className="space-y-4">
              <button
                onClick={handleOpenFolder}
                className="flex items-center gap-3 text-[13px] text-aeres-blue hover:underline decoration-aeres-blue/50 underline-offset-4"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                Open Folder...
              </button>
              <button
                onClick={() => window.electron?.window?.newWindow()}
                className="flex items-center gap-3 text-[13px] text-aeres-muted hover:text-aeres-text hover:underline decoration-aeres-muted/50 underline-offset-4"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="13" height="13" rx="1"/>
                  <path d="M8 21h13a1 1 0 0 0 1-1V8"/>
                </svg>
                New Window
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-aeres-border">
            <div className="grid grid-cols-1 gap-x-12 gap-y-4">
              {shortcuts.map((s) => (
                <div key={s.label} className="flex items-center justify-between group">
                  <span className="text-[12px] text-aeres-muted group-hover:text-aeres-text transition-colors">{s.label}</span>
                  <div className="flex gap-1.5">
                    {s.keys.split(' + ').map(key => (
                      <kbd key={key} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-sans text-[10px] text-aeres-muted min-w-[30px] text-center">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 text-[11px] text-aeres-muted/30 font-mono tracking-widest uppercase">
          AERES // SYSTEM READY
        </div>
      </div>
    </div>
  )
}
