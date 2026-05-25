import { useStore } from '../../store.js'

const THEME_OPTIONS = [
  { id: 'dark', name: 'Aeres Dark', bg: '#020617', accent: '#7C3AED' },
  { id: 'cyberpunk', name: 'Neon Cyber', bg: '#050508', accent: '#00ffff' },
  { id: 'nord', name: 'Nordic Frost', bg: '#1b222d', accent: '#88c0d0' },
  { id: 'retro', name: 'Retro Green', bg: '#0c0f0d', accent: '#33ff33' },
  { id: 'solarized', name: 'Solar Abyss', bg: '#001b22', accent: '#cb4b16' },
  { id: 'amethyst', name: 'Amethyst', bg: '#0f0b1b', accent: '#a855f7' },
  { id: 'aeres', name: 'Aeres Cyber', bg: '#09090e', accent: '#ff8ba7' },
]

export default function EditorSettings() {
  const settings = useStore((s) => s.editorSettings)
  const setSetting = useStore((s) => s.setEditorSetting)
  const activeTheme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  return (
    <div className="p-4 glass-panel rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] w-72 text-slate-100 border border-slate-700/40 relative z-50">
       <h4 className="text-[11px] font-extrabold uppercase tracking-widest mb-4 border-b border-slate-800/60 pb-2 text-[#7C3AED] flex items-center justify-between">
         <span>Aeres IDE Settings</span>
         <span className="text-[9px] text-slate-500 font-mono">v1.1.0</span>
       </h4>
       
       <div className="space-y-4.5">
         {/* Theme Customization */}
         <div className="space-y-2">
           <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">IDE Theme</label>
           <div className="grid grid-cols-2 gap-2">
             {THEME_OPTIONS.map((themeOption) => (
               <button
                 key={themeOption.id}
                 type="button"
                 onClick={() => setTheme(themeOption.id)}
                 className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                   activeTheme === themeOption.id
                     ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-white shadow-lg'
                     : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-slate-700/60'
                 }`}
               >
                 {/* Color Preview Badges */}
                 <div className="flex shrink-0 gap-0.5 w-4 h-4 rounded-full border border-slate-800 overflow-hidden">
                   <div className="flex-1" style={{ backgroundColor: themeOption.bg }} />
                   <div className="w-1.5" style={{ backgroundColor: themeOption.accent }} />
                 </div>
                 <span className="text-[10px] font-medium truncate">{themeOption.name}</span>
               </button>
             ))}
           </div>
         </div>

         <div className="h-px bg-slate-800/50 my-3" />

         {/* Editor Settings */}
         <div className="space-y-3.5">
           <div className="flex flex-col gap-1.5">
             <div className="flex justify-between items-center">
               <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Font Size</label>
               <span className="text-[10px] font-mono text-slate-300 font-semibold">{settings.fontSize || 14}px</span>
             </div>
             <input 
               type="range" min="10" max="24" value={settings.fontSize || 14} 
               onChange={(e) => setSetting('fontSize', parseInt(e.target.value))}
               className="w-full accent-[#7C3AED] h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
             />
           </div>
           
           <div className="flex items-center justify-between">
             <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Word Wrap</label>
             <select 
               value={settings.wordWrap || 'off'} 
               onChange={(e) => setSetting('wordWrap', e.target.value)}
               className="bg-slate-950/80 border border-slate-800/60 rounded-md px-2 py-1 text-[10px] outline-none text-slate-200 focus:border-[#7C3AED] transition cursor-pointer"
             >
               <option value="off">Off</option>
               <option value="on">On</option>
               <option value="wordWrapColumn">Column</option>
               <option value="bounded">Bounded</option>
             </select>
           </div>
           
           <div className="flex items-center justify-between">
             <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Minimap Sidebar</label>
             <input 
               type="checkbox" 
               checked={settings.minimap} 
               onChange={(e) => setSetting('minimap', e.target.checked)}
               className="accent-[#7C3AED] w-3 h-3 cursor-pointer rounded border-slate-800 bg-slate-950"
             />
           </div>
         </div>
       </div>
    </div>
  )
}
