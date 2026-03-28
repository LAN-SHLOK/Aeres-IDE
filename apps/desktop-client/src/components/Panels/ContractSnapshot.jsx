import React, { useState, useEffect } from 'react'
import { useStore } from '../../store.js'

export default function ContractSnapshot() {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(null) // function name

  async function fetchSummary() {
    if (!activeTab || !window.electron) return
    setLoading(true)
    try {
      const token = await window.electron.auth.getToken()
      const resp = await fetch(`${useStore.getState().backendUrl}/api/contracts/summary?file_path=${encodeURIComponent(activeTab.path)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setSummary(await resp.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
    const int = setInterval(fetchSummary, 5000)
    return () => clearInterval(int)
  }, [activeTab?.path])

  async function handleGenerate(fn) {
    if (!activeTab) return
    setGenerating(fn)
    try {
      const token = await window.electron.auth.getToken()
      const resp = await fetch(`${useStore.getState().backendUrl}/api/contracts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          file_path: activeTab.path,
          function_name: fn,
          language: activeTab.language
        })
      })
      const { tests } = await resp.json()
      // Open new tab with the test content
      const testFileName = `${activeTab.name.replace(/\.[^/.]+$/, '')}.test.${activeTab.language === 'python' ? 'py' : 'js'}`
      useStore.getState().openTab({
        id: `test-${fn}-${Date.now()}`,
        name: testFileName,
        path: activeTab.path.replace(activeTab.name, testFileName),
        content: tests,
        language: activeTab.language,
        isDirty: true
      })
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(null)
    }
  }

  if (!activeTab) return (
    <div className="p-8 text-center text-aether-muted text-sm">Open a file to see observed behaviors.</div>
  )

  return (
    <div className="flex flex-col h-full bg-aether-bg">
      <div className="p-3 border-b border-aether-border flex justify-between items-center">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Contract Snapshots</h3>
        <button onClick={fetchSummary} className="p-1 hover:text-white transition-colors text-aether-muted">
          <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && summary.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
             <div className="w-8 h-8 rounded-full border-2 border-aether-violet border-t-transparent animate-spin" />
             <span className="text-[10px] text-aether-muted animate-pulse uppercase font-bold tracking-widest">Watching runtime artifacts...</span>
          </div>
        ) : summary.length === 0 ? (
          <div className="p-8 text-center text-aether-muted text-xs">
            No observations yet. Run or debug your code to capture runtime behavior.
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {summary.map(s => (
              <div key={s.function} className="p-3 rounded-lg border border-aether-border bg-aether-surface/40 group hover:border-aether-violet/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-white truncate max-w-[150px]">{s.function}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] bg-aether-violet/20 text-aether-violet px-1.5 py-0.5 rounded leading-none">{s.callCount} calls</span>
                    {s.edgeCases > 0 && <span className="text-[10px] bg-aether-amber/20 text-aether-amber px-1.5 py-0.5 rounded leading-none">{s.edgeCases} edges</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleGenerate(s.function)}
                  disabled={generating === s.function}
                  className="w-full py-1.5 text-[10px] font-bold uppercase tracking-wider bg-aether-border hover:bg-aether-violet text-white transition-colors rounded shadow-sm disabled:opacity-50"
                >
                  {generating === s.function ? 'Generating...' : 'Generate Snapshot Test'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-aether-violet/5 border-t border-aether-violet/20">
        <p className="text-[10px] text-aether-violet/80 leading-relaxed italic">
          Aether IDE anchors your code to reality by watching its true behavior at runtime, shielding you from assumption-based regressions.
        </p>
      </div>
    </div>
  )
}
