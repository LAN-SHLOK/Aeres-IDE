import React, { useEffect, useState } from 'react'
import { useStore } from '../../store.js'

export default function ContractPanel() {
  const activeTab = useStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(null) // function name

  const loadSummary = async () => {
    if (!activeTab?.path) return
    setLoading(true)
    const res = await window.electron.contract.getSummary({ filePath: activeTab.path })
    setSummary(res)
    setLoading(false)
  }

  useEffect(() => {
    loadSummary()
    const off = window.electron.contract.onSuggestion(() => {
        loadSummary()
    })
    return off
  }, [activeTab?.path])

  const handleGenerate = async (fn) => {
    setGenerating(fn)
    const res = await window.electron.contract.generate({ 
        file_path: activeTab.path, 
        function_name: fn,
        language: activeTab.language 
    })
    if (res.tests) {
        const isReact = activeTab.content?.includes('React') || activeTab.content?.includes('export default') || activeTab.name.endsWith('x') || activeTab.name.includes('page') || activeTab.name.includes('layout');
        let ext = 'js';
        if (activeTab.language === 'typescript' || activeTab.language === 'typescriptreact') {
            ext = isReact ? 'tsx' : 'ts';
        } else {
            ext = isReact ? 'jsx' : 'js';
        }
        const testName = activeTab.language === 'python' ? `test_${fn}.py` : `${fn}.test.${ext}`
        useStore.getState().addTab({
            id: `test-${fn}-${Date.now()}`,
            name: testName,
            path: `virtual:///${testName}`,
            content: res.tests,
            language: (ext === 'ts' || ext === 'tsx') ? 'typescript' : (activeTab.language === 'python' ? 'python' : 'javascript'),
            isVirtual: true
        })
    }
    setGenerating(null)
  }

  if (!activeTab) return <div className="p-4 text-aeres-muted italic">No active file</div>

  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      <div className="p-3 border-b border-aeres-border flex justify-between items-center">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Contract Observations</h3>
        <button onClick={loadSummary} className="text-aeres-muted hover:text-white transition-colors">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && <div className="text-center py-4 text-aeres-muted text-xs">Scanning contracts...</div>}
        {!loading && summary.length === 0 && (
            <div className="text-center py-8 text-aeres-muted">
                <div className="text-3xl mb-2 opacity-20">🧪</div>
                <p className="text-xs">No observations recorded yet.<br/>Run your code to capture contracts.</p>
            </div>
        )}
        
        {summary.map((s) => (
            <div key={s.function} className="mb-4 p-3 rounded-sm bg-slate-900/40 border border-slate-800/50 group">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="text-xs font-bold text-slate-200">{s.function}()</div>
                        <div className="text-[10px] text-slate-500">{s.callCount} unique observations</div>
                    </div>
                    {s.edgeCases > 0 && (
                        <div className="px-1.5 py-0.5 rounded-full bg-amber-900/30 border border-amber-700/30 text-[9px] text-amber-300 font-bold uppercase">
                            {s.edgeCases} Edge Cases
                        </div>
                    )}
                </div>

                <button
                    disabled={generating === s.function}
                    onClick={() => handleGenerate(s.function)}
                    className="w-full mt-2 py-1.5 px-2 bg-aeres-violet text-white text-[10px] font-bold rounded-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                    {generating === s.function ? 'Generating Tests...' : 'Generate Snapshot Tests'}
                </button>
            </div>
        ))}
      </div>
      
      <div className="p-3 text-[10px] text-slate-500 border-t border-aeres-border bg-slate-900/20">
         <p>Observations are captured automatically during run/debug sessions via background hooks.</p>
      </div>
    </div>
  )
}
