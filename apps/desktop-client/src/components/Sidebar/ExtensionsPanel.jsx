export default function ExtensionsPanel() {
  const extensions = [
    { name: "Aether AI Core", desc: "Advanced code modernization & intelligence", author: "Aether", popular: true },
    { name: "Prettier Formatter", desc: "Code formatting using Prettier", author: "Esben Petersen", popular: true },
    { name: "ESLint", desc: "Integrates ESLint JavaScript into Aether", author: "Microsoft", popular: false },
    { name: "Tailwind CSS IntelliSense", desc: "Intelligent Tailwind CSS tooling", author: "Tailwind Labs", popular: true }
  ]

  return (
    <div className="flex flex-col h-full bg-aether-bg border-r border-aether-border">
      <div className="p-3 border-b border-aether-border bg-aether-surface shrink-0">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Extensions</h2>
        <input 
          type="text" 
          placeholder="Search Extensions in Marketplace..." 
          className="w-full bg-aether-bg border border-aether-border rounded px-3 py-1.5 text-xs focus:border-aether-violet outline-none transition-colors placeholder:text-aether-muted text-aether-text shadow-inner"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
        <p className="px-2 text-[10px] font-bold text-aether-muted uppercase tracking-widest mt-2">Recommended</p>
        
        {extensions.map((ext, i) => (
           <div key={i} className="flex flex-col p-3 rounded-lg border border-transparent hover:border-aether-border hover:bg-aether-surface/40 cursor-pointer transition-all group">
             <div className="flex items-start gap-3">
               <div className="w-10 h-10 rounded shrink-0 bg-gradient-to-br from-aether-surface to-aether-bg border border-aether-border flex items-center justify-center shadow-sm">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-aether-violet"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
               </div>
               <div className="min-w-0 flex-1">
                 <h3 className="text-xs font-bold text-white truncate group-hover:text-aether-violet transition-colors">{ext.name}</h3>
                 <p className="text-[10px] text-aether-muted truncate mt-0.5">{ext.desc}</p>
                 <div className="flex items-center gap-2 mt-1.5">
                   <span className="text-[9px] text-aether-text opacity-70">{ext.author}</span>
                   {ext.popular && (
                     <span className="flex items-center gap-0.5 text-[9px] text-amber-400 ml-auto bg-amber-400/10 px-1 rounded">
                       <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                       Popular
                     </span>
                   )}
                 </div>
               </div>
             </div>
           </div>
        ))}
      </div>
    </div>
  )
}
