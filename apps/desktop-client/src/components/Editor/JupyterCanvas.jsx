import { useEffect, useState, useRef } from 'react'
import { useStore } from '../../store.js'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'

export default function JupyterCanvas() {
  const store = useStore()
  const activeTab = store.tabs.find(t => t.id === store.activeTabId)
  const [cells, setCells] = useState([])
  const [outputs, setOutputs] = useState({}) // cellIndex -> array of outputs
  const [sessionId, setSessionId] = useState(null)
  const [runningCell, setRunningCell] = useState(null)

  useEffect(() => {
    if (!activeTab || !activeTab.path) return
    const id = activeTab.path.replace(/\\/g, '/')
    setSessionId(id)

    // Parse the ipynb content
    try {
      if (activeTab.content) {
        const nb = JSON.parse(activeTab.content)
        if (nb.cells) {
          setCells(nb.cells.map(c => ({
            type: c.cell_type, // 'markdown' or 'code'
            source: Array.isArray(c.source) ? c.source.join('') : c.source,
            executionCount: c.execution_count || null
          })))
        }
      } else {
        setCells([{ type: 'code', source: '', executionCount: null }])
      }
    } catch (e) {
      console.error("Failed to parse ipynb:", e)
    }

    return () => {
      // Stop kernel on unmount if needed, or leave it running for session
    }
  }, [activeTab])

  const runCell = async (index) => {
    const cell = cells[index]
    if (cell.type !== 'code' || !cell.source.trim()) return

    setRunningCell(index)
    setOutputs(prev => ({ ...prev, [index]: [] }))

    try {
      const res = await fetch(`${store.backendUrl}/api/jupyter/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          code: cell.source
        })
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (dataStr === '[DONE]') {
              setRunningCell(null)
              return
            }
            try {
              const out = JSON.parse(dataStr)
              setOutputs(prev => {
                const existing = prev[index] || []
                return { ...prev, [index]: [...existing, out] }
              })
            } catch(e) {}
          }
        }
      }
    } catch (e) {
      console.error("Execution error", e)
    }
    setRunningCell(null)
  }

  const updateCellSource = (index, value) => {
    setCells(prev => {
      const next = [...prev]
      next[index] = { ...next[index], source: value }
      return next
    })
  }

  const saveNotebook = async () => {
    try {
      let currentNb = {}
      if (activeTab.content) {
        currentNb = JSON.parse(activeTab.content)
      }
      currentNb.cells = cells.map(c => ({
        cell_type: c.type,
        source: c.source.split('\n').map(l => l + '\n'),
        metadata: {},
        execution_count: c.executionCount
      }))
      const newContent = JSON.stringify(currentNb, null, 2)
      await window.electron.fs.writeFile(activeTab.path, newContent)
      useStore.getState().updateTab(activeTab.id, { content: newContent, isDirty: false })
    } catch (e) {
      console.error("Failed to save notebook:", e)
    }
  }

  const addCell = (index, type) => {
    setCells(prev => {
      const next = [...prev]
      next.splice(index + 1, 0, { type, source: '', executionCount: null })
      return next
    })
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-900 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <span className="text-sm font-semibold text-slate-300">Jupyter Notebook (Python 3)</span>
        <div className="flex gap-2">
          <button onClick={saveNotebook} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold">Save</button>
        </div>
      </div>
      
      <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
        {cells.length === 0 && (
          <div className="text-slate-500 text-center mt-10">No cells found.</div>
        )}
        {cells.map((cell, idx) => (
          <div key={idx} className="group relative rounded-md border border-slate-800 bg-slate-950/50 shadow-sm transition-all focus-within:border-blue-500/50">
            {/* Cell Actions */}
            <div className="absolute -left-12 top-2 flex flex-col items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-xs text-slate-600">[{cell.executionCount || ' '}]</span>
              {cell.type === 'code' && (
                <button 
                  onClick={() => runCell(idx)}
                  disabled={runningCell === idx}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                  title="Run Cell"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
              )}
            </div>

            <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100 z-10">
              <button onClick={() => addCell(idx, 'code')} className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 hover:bg-blue-500/40">+ Code</button>
              <button onClick={() => addCell(idx, 'markdown')} className="rounded bg-slate-700/50 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700">+ Markdown</button>
            </div>

            {cell.type === 'markdown' ? (
              <div className="p-4 text-slate-300 prose prose-invert max-w-none">
                <ReactMarkdown>{cell.source || '*Double click to edit markdown*'}</ReactMarkdown>
                {/* Simplified: click to edit can be added, for now rendering as markdown */}
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="min-h-[60px] p-2" style={{ height: Math.max(60, cell.source.split('\n').length * 20 + 20) }}>
                  <Editor
                    height="100%"
                    language="python"
                    theme="vs-dark"
                    value={cell.source}
                    onChange={(val) => updateCellSource(idx, val)}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      lineNumbers: 'off',
                      folding: false,
                      glyphMargin: false,
                      lineDecorationsWidth: 10,
                      lineNumbersMinChars: 0
                    }}
                  />
                </div>
                
                {/* Outputs */}
                {(outputs[idx] && outputs[idx].length > 0) && (
                  <div className="border-t border-slate-800 bg-slate-900 p-4">
                    {outputs[idx].map((out, oidx) => {
                      if (out.type === 'stream') {
                        return <pre key={oidx} className={`text-xs ${out.name === 'stderr' ? 'text-red-400' : 'text-slate-300'}`}>{out.text}</pre>
                      } else if (out.type === 'execute_result' || out.type === 'display_data') {
                        if (out.data['image/png']) {
                          return <img key={oidx} src={`data:image/png;base64,${out.data['image/png']}`} alt="Output" className="max-w-full bg-white p-2 rounded" />
                        }
                        if (out.data['text/plain']) {
                          return <pre key={oidx} className="text-xs text-slate-300">{out.data['text/plain']}</pre>
                        }
                      } else if (out.type === 'error') {
                        return (
                          <div key={oidx} className="text-xs text-red-400">
                            <strong>{out.ename}: {out.evalue}</strong>
                            <pre className="mt-2 text-[10px] opacity-80">{out.traceback.join('\n')}</pre>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
