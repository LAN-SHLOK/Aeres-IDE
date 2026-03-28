import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store.js'

export default function DebugPanel() {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const variables = useStore((s) => s.variables)
  const callStack = useStore((s) => s.callStack)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState([])
  const outputRef = useRef(null)

  useEffect(() => {
    if (!window.electron) return
    const offOutput = window.electron.debug.onOutput((data) => {
      const text = typeof data === 'string' ? data : data.content || JSON.stringify(data)
      const type = data.category === 'stderr' ? 'stderr' : 'stdout'
      setOutput(v => [...v, { type, text }].slice(-500))
    })
    const offTerm = window.electron.debug.onTerminated(() => {
      setIsRunning(false)
      setOutput(v => [...v, { type: 'system', text: '--- SESSION TERMINATED ---' }])
    })
    return () => {
      offOutput()
      offTerm()
    }
  }, [])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  async function handleLaunch() {
    if (!activeTab || !window.electron) return
    setOutput([{ type: 'system', text: `LAUNCHING: ${activeTab.path}...` }])
    setIsRunning(true)
    const res = await window.electron.debug.launch(activeTab.path, false)
    if (res.error) {
       setOutput(v => [...v, { type: 'stderr', text: `ERROR: ${res.error}` }])
       setIsRunning(false)
    }
  }

  async function handleStop() {
    if (!window.electron) return
    await window.electron.debug.stop()
    setIsRunning(false)
  }

  if (!activeTab) return (
    <div className="p-8 text-center text-aether-muted text-sm">Open a file to start a debug session.</div>
  )

  return (
    <div className="flex flex-col h-full bg-aether-bg">
      <div className="p-3 border-b border-aether-border flex justify-between items-center bg-aether-surface/40">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Debugger ({activeTab.language})</h3>
        <div className="flex gap-1">
          {!isRunning ? (
            <button
               onClick={handleLaunch}
               className="p-1 px-3 bg-aether-violet hover:bg-aether-violet/80 text-white rounded text-[10px] font-bold shadow-sm transition-all"
            >
              RUN / DEBUG
            </button>
          ) : (
            <button
               onClick={handleStop}
               className="p-1 px-3 bg-aether-red hover:bg-aether-red/80 text-white rounded text-[10px] font-bold shadow-sm transition-all"
            >
              STOP
            </button>
          )}
        </div>
      </div>

      <div ref={outputRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed selection:bg-aether-violet/40 no-scrollbar relative min-h-[200px]">
        {output.map((line, i) => (
           <div key={i} className={line.type === 'stderr' ? 'text-aether-red' : line.type === 'system' ? 'text-aether-blue font-bold' : 'text-aether-text'}>
             {line.text}
           </div>
        ))}
        {output.length === 0 && (
          <div className="text-center text-aether-muted opacity-30 mt-12">
            <div className="flex justify-center mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-aether-violet/50"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            READY TO ORCHESTRATE
          </div>
        )}
        
        {isRunning && (
          <div className="sticky bottom-0 left-0 right-0 bg-aether-bg/80 backdrop-blur border-t border-white/5 p-1 mt-4">
             <input 
               type="text" 
               placeholder="> Evaluate expression..." 
               className="w-full bg-transparent border-none outline-none text-[10px] text-aether-violet placeholder:text-aether-muted"
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   const cmd = e.target.value
                   setOutput(v => [...v, { type: 'system', text: `> ${cmd}` }])
                   window.electron.debug.command({ command: 'evaluate', expression: cmd })
                   e.target.value = ''
                 }
               }}
             />
          </div>
        )}
      </div>

      <div className="p-3 bg-aether-surface/20 border-t border-aether-border space-y-4">
        {/* Variables Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase text-aether-muted font-bold tracking-tight">Variables (Locals)</span>
          </div>
          <div className="max-h-40 overflow-y-auto bg-aether-bg/60 rounded border border-aether-border p-2 space-y-1 no-scrollbar">
            {variables.locals.length > 0 ? (
              variables.locals.map((v, i) => (
                <div key={i} className="flex justify-between text-[10px] font-mono border-b border-white/5 pb-1">
                  <span className="text-aether-violet">{v.name}</span>
                  <span className="text-aether-text truncate ml-2">{v.value}</span>
                </div>
              ))
            ) : (
              <div className="text-[9px] text-aether-muted text-center py-2 italic">No variables available.</div>
            )}
          </div>
        </div>

        {/* Call Stack Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase text-aether-muted font-bold tracking-tight">Call Stack</span>
          </div>
          <div className="max-h-32 overflow-y-auto bg-aether-bg/60 rounded border border-aether-border p-1 space-y-1 no-scrollbar">
            {callStack.length > 0 ? (
              callStack.map((f, i) => (
                <div key={i} className={`p-1.5 rounded text-[10px] cursor-pointer transition ${i === 0 ? 'bg-aether-violet/20 text-white' : 'hover:bg-white/5 text-aether-muted'}`}>
                  <div className="font-bold truncate">{f.name}</div>
                  <div className="text-[8px] opacity-60 truncate">{f.file}:{f.line}</div>
                </div>
              ))
            ) : (
              <div className="text-[9px] text-aether-muted text-center py-2 italic">Stack trace unavailable.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
