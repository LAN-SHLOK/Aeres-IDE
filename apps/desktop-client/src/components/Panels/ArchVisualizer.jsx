export default function ArchVisualizer() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-aether-bg">
       <div className="text-center">
         <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-aether-violet/20 to-blue-500/20 border border-aether-violet/30 mb-4 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-aether-violet"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
         </div>
         <h2 className="text-lg font-bold text-white mb-2">Architecture Visualizer</h2>
         <p className="text-xs text-aether-muted max-w-[250px] mx-auto leading-relaxed">
           Select a module or entry point to automatically generate a dependency graph of your codebase.
         </p>
         <button className="mt-6 px-4 py-2 bg-aether-surface hover:bg-white/10 border border-aether-border rounded-lg text-xs font-semibold text-white transition-all shadow-md">
           Scan Project Architecture
         </button>
       </div>
    </div>
  )
}
