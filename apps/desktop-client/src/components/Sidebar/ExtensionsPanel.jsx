import { useState } from 'react'
import { useStore } from '../../store.js'

const EXTENSIONS_MARKETPLACE = [
  { id: 'aeres-ai-core', name: "Aeres AI Core", desc: "Advanced code modernization & AI assistant features", author: "Aeres", popular: true },
  { id: 'prettier-formatter', name: "Prettier Formatter", desc: "Fast code formatting on Save (Ctrl+S)", author: "Esben Petersen", popular: true },
  { id: 'eslint', name: "ESLint", desc: "Integrates real-time static code checks in Problems", author: "Microsoft", popular: false },
  { id: 'tailwind-intellisense', name: "Tailwind CSS", desc: "Intelligent class auto-completions in editor", author: "Tailwind Labs", popular: true },
  { id: 'gitlens-elite', name: "GitLens Elite", desc: "Discreet inline blame annotations on editor lines", author: "GitKraken", popular: false }
]

export default function ExtensionsPanel() {
  const installed = useStore((s) => s.installedExtensions || [])
  const disabled = useStore((s) => s.disabledExtensions || [])
  const install = useStore((s) => s.installExtension)
  const uninstall = useStore((s) => s.uninstallExtension)
  const toggleDisable = useStore((s) => s.toggleDisableExtension)

  const [downloadingIds, setDownloadingIds] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  const handleInstall = (id) => {
    if (downloadingIds.includes(id)) return
    setDownloadingIds(prev => [...prev, id])
    setTimeout(() => {
      install(id)
      setDownloadingIds(prev => prev.filter(x => x !== id))
    }, 1500)
  }

  const filteredMarketplace = EXTENSIONS_MARKETPLACE.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.desc.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="flex flex-col h-full bg-aeres-bg border-r border-aeres-border">
      <div className="p-3 border-b border-aeres-border bg-aeres-surface shrink-0">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Extensions</h2>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Extensions in Marketplace..." 
          className="w-full bg-slate-950 border border-aeres-border rounded px-3 py-1.5 text-xs focus:border-aeres-violet outline-none transition-colors placeholder:text-aeres-muted text-aeres-text shadow-inner"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-4 no-scrollbar">
        {/* SECTION 1: INSTALLED EXTENSIONS */}
        <div>
          <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Installed ({installed.length})</p>
          <div className="space-y-1.5">
            {filteredMarketplace.filter(e => installed.includes(e.id)).map(ext => {
              const isDisabled = disabled.includes(ext.id)
              return (
                <div key={ext.id} className="flex flex-col p-3 rounded-lg border border-slate-800 bg-slate-900/40 cursor-default transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded shrink-0 bg-[#7C3AED]/10 border border-[#7C3AED]/30 flex items-center justify-center shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-white truncate">{ext.name}</h3>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{ext.desc}</p>
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="text-[9px] text-slate-500">{ext.author}</span>
                        {isDisabled ? (
                          <span className="text-[9px] px-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-semibold">Disabled</span>
                        ) : (
                          <span className="text-[9px] px-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold">Active</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3 border-t border-slate-800/60 pt-2">
                        <button
                          onClick={() => toggleDisable(ext.id)}
                          className={`text-[9px] font-bold px-2.5 py-1 rounded transition ${
                            isDisabled 
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {isDisabled ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          onClick={() => uninstall(ext.id)}
                          className="ml-auto text-[9px] font-bold text-rose-500 hover:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded transition"
                        >
                          Uninstall
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {installed.length === 0 && (
              <p className="px-2 text-[10px] italic text-slate-600">No extensions active.</p>
            )}
          </div>
        </div>

        <div className="h-px bg-slate-800/40" />

        {/* SECTION 2: MARKETPLACE / RECOMMENDED */}
        <div>
          <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Marketplace</p>
          <div className="space-y-1.5">
            {filteredMarketplace.filter(e => !installed.includes(e.id)).map(ext => {
              const isDownloading = downloadingIds.includes(ext.id)
              return (
                <div key={ext.id} className="flex flex-col p-3 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/20 cursor-default transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded shrink-0 bg-slate-950 border border-slate-850 flex items-center justify-center shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-slate-300 transition-colors"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-slate-300 truncate group-hover:text-white transition-colors">{ext.name}</h3>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{ext.desc}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] text-slate-500">{ext.author}</span>
                        {ext.popular && (
                          <span className="flex items-center gap-0.5 text-[8px] font-semibold text-amber-500 bg-amber-500/10 px-1 rounded border border-amber-500/20">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                            Popular
                          </span>
                        )}
                        <button
                          onClick={() => handleInstall(ext.id)}
                          disabled={isDownloading}
                          className={`ml-auto text-[9px] font-bold px-2.5 py-1 rounded transition flex items-center gap-1 ${
                            isDownloading 
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
                              : 'text-white bg-[#7C3AED] hover:bg-opacity-90 shadow-sm shadow-[#7C3AED]/20'
                          }`}
                        >
                          {isDownloading ? (
                            <>
                              <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"/></svg>
                              Installing...
                            </>
                          ) : (
                            'Install'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
