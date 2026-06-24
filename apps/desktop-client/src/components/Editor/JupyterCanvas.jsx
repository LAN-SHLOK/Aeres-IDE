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
  const [editingCell, setEditingCell] = useState(null)

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

    return () => {}
  }, [activeTab])

  const runCell = async (index) => {
    const cell = cells[index]
    if (!cell || cell.type !== 'code' || !cell.source.trim()) return

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
      let buffer = ''
      
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        
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

  const runAllCells = async () => {
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].type === 'code') {
        await runCell(i)
      }
    }
  }

  const restartKernel = async () => {
    try {
      await fetch(`${store.backendUrl}/api/jupyter/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })
      setOutputs({})
      setCells(prev => prev.map(c => ({ ...c, executionCount: null })))
    } catch (e) {
      console.error("Failed to restart kernel:", e)
    }
  }

  const updateCellSource = (index, value) => {
    setCells(prev => {
      const next = [...prev]
      next[index] = { ...next[index], source: value }
      return next
    })
  }

  const moveCell = (index, direction) => {
    if (index + direction < 0 || index + direction >= cells.length) return
    setCells(prev => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[index + direction]
      next[index + direction] = temp
      return next
    })
    setOutputs(prev => {
      const next = { ...prev }
      const temp = next[index]
      next[index] = next[index + direction]
      next[index + direction] = temp
      return next
    })
  }

  const deleteCell = (index) => {
    setCells(prev => prev.filter((_, i) => i !== index))
    setOutputs(prev => {
      const next = { ...prev }
      delete next[index]
      const shifted = {}
      Object.keys(next).forEach(key => {
        const k = parseInt(key)
        if (k > index) {
          shifted[k - 1] = next[k]
        } else if (k < index) {
          shifted[k] = next[k]
        }
      })
      return shifted
    })
  }

  const saveNotebook = async () => {
    try {
      let currentNb = {}
      if (activeTab.content) {
        currentNb = JSON.parse(activeTab.content)
      }
      currentNb.cells = cells.map((c, i) => ({
        cell_type: c.type,
        source: c.source.split('\n').map((l, idx, arr) => idx === arr.length - 1 ? l : l + '\n'),
        metadata: {},
        execution_count: c.executionCount,
        outputs: outputs[i] || []
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
    setOutputs(prev => {
      const shifted = {}
      Object.keys(prev).forEach(key => {
        const k = parseInt(key)
        if (k > index) {
          shifted[k + 1] = prev[k]
        } else {
          shifted[k] = prev[k]
        }
      })
      return shifted
    })
    if (type === 'markdown') {
      setEditingCell(index + 1)
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-900 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <span className="text-sm font-semibold text-slate-300">Jupyter Notebook (Python 3)</span>
        <div className="flex gap-2">
          <button onClick={runAllCells} disabled={runningCell !== null} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold disabled:opacity-50">Run All</button>
          <button onClick={restartKernel} className="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded text-xs font-semibold">Restart Kernel</button>
          <button onClick={saveNotebook} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold">Save</button>
        </div>
      </div>
      
      <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full pb-20">
        {cells.length === 0 && (
          <div className="text-slate-500 text-center mt-10">
            No cells found. 
            <button onClick={() => addCell(-1, 'code')} className="text-blue-400 hover:underline ml-2">Add Code Cell</button>
          </div>
        )}
        
        {/* Top add cell buttons if no cells or at the very top */}
        {cells.length > 0 && (
          <div className="relative flex justify-center -mb-4 opacity-0 hover:opacity-100 z-10 transition-opacity pb-2">
             <button onClick={() => addCell(-1, 'code')} className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 hover:bg-blue-500/40 mr-1">+ Code</button>
             <button onClick={() => addCell(-1, 'markdown')} className="rounded bg-slate-700/50 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700">+ Markdown</button>
          </div>
        )}

        {cells.map((cell, idx) => (
          <div key={idx} className="group relative rounded-md border border-slate-800 bg-slate-950/50 shadow-sm transition-all focus-within:border-blue-500/50">
            
            {/* Cell Actions Left Margin */}
            <div className="absolute -left-12 top-2 flex flex-col items-center gap-1 opacity-20 transition-opacity group-hover:opacity-100">
              <span className="text-xs text-slate-600 font-mono">[{cell.executionCount || ' '}]</span>
              {cell.type === 'code' && (
                <button 
                  onClick={() => runCell(idx)}
                  disabled={runningCell === idx}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-green-400 hover:bg-green-500/20 disabled:opacity-50 mt-1"
                  title="Run Cell"
                >
                  {runningCell === idx ? (
                     <div className="w-3 h-3 rounded-full border-2 border-green-400 border-t-transparent animate-spin"></div>
                  ) : (
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  )}
                </button>
              )}
            </div>

            {/* Cell Actions Right Top */}
            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 z-10 bg-slate-900/90 rounded border border-slate-700 p-1">
              <button onClick={() => moveCell(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-white disabled:opacity-30 p-1" title="Move Up">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
              <button onClick={() => moveCell(idx, 1)} disabled={idx === cells.length - 1} className="text-slate-400 hover:text-white disabled:opacity-30 p-1" title="Move Down">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </button>
              <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
              <button onClick={() => deleteCell(idx)} className="text-slate-400 hover:text-red-400 p-1" title="Delete Cell">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>

            {/* Insert Below Actions */}
            <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100 z-10">
              <button onClick={() => addCell(idx, 'code')} className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 hover:bg-blue-500/40">+ Code</button>
              <button onClick={() => addCell(idx, 'markdown')} className="rounded bg-slate-700/50 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700">+ Markdown</button>
            </div>

            {cell.type === 'markdown' ? (
              <div 
                className="p-4 min-h-[60px]" 
                onDoubleClick={() => setEditingCell(idx)}
              >
                {editingCell === idx ? (
                  <div className="flex flex-col gap-2">
                    <textarea 
                      className="w-full bg-slate-900 text-slate-300 border border-blue-500/50 rounded p-3 font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={cell.source}
                      onChange={(e) => updateCellSource(idx, e.target.value)}
                      rows={Math.max(3, cell.source.split('\n').length)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                          e.preventDefault()
                          setEditingCell(null)
                        }
                      }}
                      onBlur={() => setEditingCell(null)}
                    />
                    <div className="text-[10px] text-slate-500 flex justify-end">Shift+Enter to preview</div>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none prose-sm cursor-text hover:bg-slate-900/30 rounded p-1 transition-colors min-h-[2em]" onClick={() => setEditingCell(idx)}>
                    <ReactMarkdown>{cell.source || '*Double click to edit markdown*'}</ReactMarkdown>
                  </div>
                )}
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
                    onMount={(editor, monaco) => {
                      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
                        runCell(idx)
                      })
                    }}
                  />
                </div>
                
                {/* Outputs */}
                {(outputs[idx] && outputs[idx].length > 0) && (
                  <div className="border-t border-slate-800 bg-slate-900 p-4">
                    {outputs[idx].map((out, oidx) => {
                      if (out.type === 'stream') {
                        return <pre key={oidx} className={`text-xs whitespace-pre-wrap font-mono ${out.name === 'stderr' ? 'text-red-400' : 'text-slate-300'}`}>{out.text}</pre>
                      } else if (out.type === 'execute_result' || out.type === 'display_data') {
                        if (out.data['image/png']) {
                          return <img key={oidx} src={`data:image/png;base64,${out.data['image/png']}`} alt="Output" className="max-w-full bg-white p-2 rounded" />
                        }
                        if (out.data['text/plain']) {
                          return <pre key={oidx} className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{out.data['text/plain']}</pre>
                        }
                      } else if (out.type === 'error') {
                        return (
                          <div key={oidx} className="text-xs text-red-400 bg-red-950/20 p-2 rounded">
                            <strong className="block mb-1">{out.ename}: {out.evalue}</strong>
                            <pre className="mt-2 text-[10px] opacity-80 whitespace-pre-wrap">{out.traceback.join('\n')}</pre>
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
