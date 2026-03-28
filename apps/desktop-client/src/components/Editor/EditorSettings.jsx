import { useStore } from '../../store.js'

export default function EditorSettings() {
  const settings = useStore((s) => s.editorSettings)
  const setSetting = useStore((s) => s.setEditorSetting)

  return (
    <div className="p-4 bg-aether-surface rounded-lg border border-aether-border shadow-2xl w-64 text-aether-text">
       <h4 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-aether-border pb-2 text-aether-violet">Editor Preferences</h4>
       
       <div className="space-y-4">
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-aether-muted uppercase">Font Size</label>
           <input 
             type="range" min="10" max="24" value={settings.fontSize || 14} 
             onChange={(e) => setSetting('fontSize', parseInt(e.target.value))}
             className="w-full accent-aether-violet"
           />
           <div className="text-[10px] text-right">{settings.fontSize || 14}px</div>
         </div>
         
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-aether-muted uppercase">Word Wrap</label>
           <select 
             value={settings.wordWrap || 'off'} 
             onChange={(e) => setSetting('wordWrap', e.target.value)}
             className="bg-aether-bg border border-aether-border rounded px-2 py-1 text-xs outline-none focus:border-aether-violet"
           >
             <option value="off">Off</option>
             <option value="on">On</option>
             <option value="wordWrapColumn">Column</option>
             <option value="bounded">Bounded</option>
           </select>
         </div>
         
         <div className="flex items-center justify-between">
           <label className="text-[10px] text-aether-muted uppercase">Minimap</label>
           <input 
             type="checkbox" 
             checked={settings.minimap} 
             onChange={(e) => setSetting('minimap', e.target.checked)}
             className="accent-aether-violet w-3 h-3 cursor-pointer"
           />
         </div>
       </div>
    </div>
  )
}
