import React, { useState, useEffect } from 'react'
import { useStore } from '../../store.js'

export default function MutationPanel() {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [data, setData] = useState({ results: [], isRunning: false })
  const [error, setError] = useState(null)

  async function fetchResults() {
    if (!activeTab || !window.electron) return
    try {
      const token = await window.electron.auth.getToken()
      const resp = await fetch(`${useStore.getState().backendUrl}/api/mutations/results?file_path=${encodeURIComponent(activeTab.path)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setData(await resp.json())
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRun() {
    if (!activeTab) return
    setError(null)
    try {
      const token = await window.electron.auth.getToken()
      await fetch(`${useStore.getState().backendUrl}/api/mutations/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          file_path: activeTab.path,
          source: activeTab.content,
          test_command: activeTab.language === 'python' ? 'pytest' : 'npm test',
          repo_path: useStore.getState().rootPath,
          max_mutations: 10
        })
      })
      fetchResults()
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchResults()
    const int = setInterval(fetchResults, 5000)
    return () => clearInterval(int)
  }, [activeTab?.path])

  if (!activeTab) return (
    <div className="p-8 text-center text-aether-muted text-sm">Open a file to see test quality analysis.</div>
  )

  const score = data.results.length === 0 ? 100 : Math.max(0, 100 - (data.results.length * 10))

  return (
    <div className="flex flex-col h-full bg-aether-bg">
      <div className="p-3 border-b border-aether-border flex justify-between items-center bg-aether-surface/40">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Test Quality (Mutation)</h3>
        <button 
          onClick={handleRun} 
          disabled={data.isRunning}
          className={`p-1 text-aether-muted hover:text-white transition-all ${data.isRunning ? 'animate-pulse' : ''}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <div className="p-4 flex flex-col items-center">
        <div className={`text-4xl font-display font-extrabold mb-1 ${data.results.length > 0 ? (score > 80 ? 'text-aether-green' : score > 50 ? 'text-aether-amber' : 'text-aether-red') : 'text-aether-muted'}`}>
          {data.results.length === 0 && !data.isRunning ? '--%' : `${score}%`}
        </div>
        <div className="text-[10px] text-aether-muted font-bold uppercase tracking-widest pl-1">Aether Quality Index</div>
      </div>

      <div className="flex-1 overflow-y-auto border-t border-aether-border">
        {data.isRunning && (
          <div className="p-4 bg-aether-violet/10 border-b border-aether-violet/20 flex items-center gap-3">
            <div className="w-2 h-2 bg-aether-violet rounded-full animate-ping" />
            <span className="text-[10px] text-aether-violet font-bold animate-pulse">MUTATING AST IN BACKGROUND...</span>
          </div>
        )}

        {data.results.length === 0 && !data.isRunning ? (
          <div className="p-8 text-center">
            <div className="flex justify-center mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aether-violet/20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p className="text-xs text-aether-muted leading-relaxed">No weak spots found or run not yet initiated. Silent Mutation Tester verifies if your tests actually prove your logic.</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            <h4 className="text-[9px] font-bold text-aether-red uppercase px-2 mb-1">Survived Mutations (Lying Tests)</h4>
            {data.results.map((r, i) => (
              <div key={i} className="p-2.5 rounded border border-aether-red/20 bg-aether-red/5 flex items-start gap-3">
                <span className="text-[10px] bg-aether-red text-white font-mono px-1 rounded">L{r.line}</span>
                <div>
                   <p className="text-[11px] text-white font-medium">{r.description}</p>
                   <p className="text-[9px] text-aether-muted italic">Tests still pass when this change is applied.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-aether-surface/20 border-t border-aether-border">
        <p className="text-[10px] leading-relaxed text-aether-muted/70 italic text-center">
          "A test suite is only as strong as the mutations it catches."
        </p>
      </div>
    </div>
  )
}
