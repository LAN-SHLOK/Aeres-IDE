import React, { useState, useEffect } from 'react'
import { Bug } from 'lucide-react'
import { useStore } from '../../store.js'
import { detectTestCommand } from '../../utils/projectRunner.js'

export default function MutationPanel() {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [data, setData] = useState({ results: [], isRunning: false })
  const [error, setError] = useState(null)

  async function fetchResults() {
    if (!activeTab || !window.electron) return
    try {
      const res = await window.electron.analyze.mutationResults(activeTab.path)
      // Normalize: backend may return { error: '...' } or null on failure
      if (res && Array.isArray(res.results)) {
        setData(res)
        useStore.getState().setMutationResults(activeTab.path, res.results)
      } else {
        // Keep existing data if fetch fails, only clear isRunning
        setData(prev => ({ ...prev, isRunning: false }))
      }
    } catch (err) {
      setError(err.message)
      setData(prev => ({ ...prev, isRunning: false }))
    }
  }

  async function handleRun() {
    if (!activeTab || !window.electron) return
    setError(null)
    
    // Dynamically resolve test command for all 30+ supported languages
    let cmd = await detectTestCommand(activeTab.path, useStore.getState().rootPath)
    if (!cmd) {
      setError(`No test runner detected for language: ${activeTab.language || 'unknown'}. Try creating a test file.`)
      return
    }
    
    try {
      setData(prev => ({ ...prev, isRunning: true }))
      await window.electron.analyze.runMutation({
        file_path: activeTab.path,
        source: activeTab.content,
        test_command: cmd,
        repo_path: useStore.getState().rootPath,
        max_mutations: 10
      })
      await fetchResults()
    } catch (err) {
      setError(err.message)
      setData(prev => ({ ...prev, isRunning: false }))
    }
  }

  useEffect(() => {
    fetchResults()
    const int = setInterval(fetchResults, 5000)
    return () => clearInterval(int)
  }, [activeTab?.path])

  if (!activeTab) return (
    <div className="p-8 text-center text-aeres-muted text-sm">Open a file to see test quality analysis.</div>
  )
  // Score calculation
  let score = 0
  if (data?.tested > 0) {
    score = Math.round(((data.tested - (data.results?.length || 0)) / data.tested) * 100)
  } else if (!data?.isRunning && data?.results?.length === 0) {
    score = 100 // Fallback logic if tested is missing but we somehow ran
  }

  const hasTestedData = typeof data?.tested === 'number'

  return (
    <div className="h-full flex flex-col bg-aeres-panel rounded-lg shadow-2xl font-sans overflow-hidden border border-aeres-border">
      <div className="flex items-center justify-between px-4 py-3 bg-aeres-surface border-b border-aeres-border">
        <div className="flex items-center gap-2">
          <Bug size={16} className="text-aeres-violet" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Mutation Score</h3>
        </div>
        <button
          onClick={handleRun}
          disabled={data?.isRunning || !activeTab}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50 text-aeres-muted hover:text-white"
          title="Run Mutation Tests"
        >
          <svg className={`w-4 h-4 ${data?.isRunning ? 'animate-spin text-aeres-violet' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <div className="p-4 flex flex-col items-center">
        <div className={`text-4xl font-display font-extrabold mb-1 ${
          data.isRunning ? 'text-aeres-muted' :
          (!hasTestedData || data.tested === 0) ? 'text-aeres-muted' :
          (score > 80 ? 'text-aeres-green' : score > 50 ? 'text-aeres-amber' : 'text-aeres-red')
        }`}>
          {data.isRunning ? '--%' : (!hasTestedData || data.tested === 0) ? '--%' : `${score}%`}
        </div>
        <div className="text-[10px] text-aeres-muted font-bold uppercase tracking-widest pl-1">Aeres Quality Index</div>
      </div>

      {(error || data?.error) && (
        <div className="mx-2 my-2 p-3 rounded-lg border border-red-800/40 bg-red-950/20 text-red-400 text-[11px] leading-relaxed animate-in slide-in-from-top-1 duration-200">
          <div className="flex gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <span className="font-bold block mb-0.5">Mutation Engine Error</span>
              {error || data?.error}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto border-t border-aeres-border">
        {data.isRunning && (
          <div className="p-4 bg-aeres-violet/10 border-b border-aeres-violet/20 flex items-center gap-3">
            <div className="w-2 h-2 bg-aeres-violet rounded-full animate-ping" />
            <span className="text-[10px] text-aeres-violet font-bold animate-pulse">MUTATING AST IN BACKGROUND...</span>
          </div>
        )}

        {(!data.isRunning && hasTestedData && data.tested === 0 && !data.error) ? (
          <div className="p-8 text-center">
            <p className="text-xs text-aeres-muted leading-relaxed">No mutable logic found in this file to test, or tests are entirely missing.</p>
          </div>
        ) : (!data.isRunning && data.results?.length === 0 && data.tested > 0) ? (
          <div className="p-8 text-center text-aeres-muted">
            <div className="flex justify-center mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/50"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <p className="text-xs text-white font-medium mb-1">Ironclad Defense!</p>
            <p className="text-[10px]">Your test suite killed 100% of the {data.tested} mutations.</p>
          </div>
        ) : (!data.isRunning && data.results?.length > 0) ? (
          <div className="p-2 space-y-2">
            <h4 className="text-[9px] font-bold text-aeres-red uppercase px-2 mb-1">
              Survived Mutations ({data.results.length} / {data.tested})
            </h4>
            {data.results.map((r, i) => (
              <div key={i} className="p-2.5 rounded border border-aeres-red/20 bg-aeres-red/5 flex items-start gap-3">
                <span className="text-[10px] bg-aeres-red text-white font-mono px-1 rounded">L{r.line}</span>
                <div>
                   <p className="text-[11px] text-white font-medium">{r.description}</p>
                   <p className="text-[9px] text-aeres-muted italic">Tests still pass when this change is applied.</p>
                </div>
              </div>
            ))}
          </div>
        ) : (!data.isRunning && !hasTestedData && !data.error) && (
           <div className="p-8 text-center">
            <div className="flex justify-center mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aeres-violet/20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p className="text-xs text-aeres-muted leading-relaxed">Run not yet initiated. Silent Mutation Tester verifies if your tests actually prove your logic.</p>
          </div>
        )}
      </div>

      <div className="p-3 bg-aeres-surface/20 border-t border-aeres-border">
        <p className="text-[10px] leading-relaxed text-aeres-muted/70 italic text-center">
          "A test suite is only as strong as the mutations it catches."
        </p>
      </div>
    </div>
  )
}
