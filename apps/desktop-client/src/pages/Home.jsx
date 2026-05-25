import { useStore } from '../../store.js'

export default function Home() {
  const rootPath = useStore((s) => s.rootPath)
  
  return (
    <div className="flex flex-col items-center justify-center h-full bg-aeres-bg text-center p-12 overflow-y-auto">
      <div className="max-w-3xl w-full">
        <h1 className="text-5xl font-bold mb-6 text-white tracking-tight">
          Welcome to <span className="text-aeres-violet">Aeres IDE</span>
        </h1>
        <p className="text-lg text-aeres-muted mb-12 max-w-xl mx-auto">
          A hyper-immersive developer environment designed for the next generation of software engineering.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-aeres-violet/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-aeres-violet/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Agentic Modernization</h3>
            <p className="text-xs text-aeres-muted">Instantly scan and refactor deprecated patterns across your entire codebase with RAG-powered intelligence.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-aeres-violet/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Deep Codebase Analysis</h3>
            <p className="text-xs text-aeres-muted">Visualize causal chains, dependency radars, and architectural snapshots in real-time.</p>
          </div>
        </div>
      </div>
      
      {!rootPath && (
        <div className="mt-12 p-8 rounded-3xl bg-aeres-violet/5 border border-aeres-violet/10">
          <p className="text-sm text-white mb-4 italic opacity-70">Ready to start?</p>
          <button 
            className="px-8 py-3 bg-aeres-violet rounded-full text-white font-bold hover:scale-105 transition-transform"
            onClick={() => window.electron.fs.openFolder()}
          >
            Open a Project Folder
          </button>
        </div>
      )}
    </div>
  )
}
