import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store.js'
import { detectFileCommand, detectProjectCommand, detectTestCommand, detectDebugCommand, getTestFileName, getTestFrameworkName } from '../../utils/projectRunner.js'
import { detectLanguage } from '../../utils/langDetect.js'
import { Bug, Lightbulb, Globe, FlaskConical, Play, Square, Loader, Terminal } from 'lucide-react'

// Per-language debug adapter hints
const DEBUG_HINTS = {
  python:      { adapter: 'debugpy', install: 'pip install debugpy' },
  go:          { adapter: 'delve',   install: 'go install github.com/go-delve/delve/cmd/dlv@latest' },
  rust:        { adapter: 'lldb',    install: 'Install CodeLLDB extension' },
  java:        { adapter: 'JDWP',   install: 'Requires JDK with debug support' },
  kotlin:      { adapter: 'JDWP',   install: 'Requires JDK with debug support' },
  csharp:      { adapter: '.NET',    install: 'dotnet-sdk includes debugger' },
  cpp:         { adapter: 'lldb/gdb', install: 'Install lldb or gdb' },
  c:           { adapter: 'lldb/gdb', install: 'Install lldb or gdb' },
  ruby:        { adapter: 'ruby-debug-ide', install: 'gem install ruby-debug-ide debase' },
  php:         { adapter: 'Xdebug', install: 'pecl install xdebug' },
  swift:       { adapter: 'lldb',   install: 'Included with Xcode' },
  dart:        { adapter: 'dart-debug', install: 'Included with Dart SDK' },
}

export default function DebugPanel() {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const rootPath = useStore((s) => s.rootPath)
  const variables = useStore((s) => s.variables)
  const callStack = useStore((s) => s.callStack)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [isRunning, setIsRunning] = useState(false)
  const [isDebugging, setIsDebugging] = useState(false)
  const [output, setOutput] = useState([])
  const [activeAction, setActiveAction] = useState(null) // 'run' | 'debug' | 'test'
  const [dapWs, setDapWs] = useState(null)
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
      setIsDebugging(false)
      setActiveAction(null)
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

  // Clear output when file changes
  useEffect(() => {
    setOutput([])
    setIsRunning(false)
    setIsDebugging(false)
    setActiveAction(null)
  }, [activeTab?.path])

  // Debug launch

  async function handleLaunch() {
    if (!activeTab) return
    setOutput([{ type: 'system', text: <span className="flex items-center gap-1.5"><Bug size={10} /> LAUNCHING DEBUG: {activeTab.name}...</span> }])
    setIsDebugging(true)
    setActiveAction('debug')
    
    try {
      const backendUrl = useStore.getState().backendUrl || 'http://127.0.0.1:8008'
      const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://')
      const ws = new WebSocket(`${wsUrl}/api/debug/dap/ws`)
      setDapWs(ws)
      
      ws.onopen = () => {
        ws.send(JSON.stringify({command: "launch", file_path: activeTab.path}))
        setOutput(v => [...v, { type: 'system', text: `Connected to DAP Server.` }])
      }
      
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === "event" && msg.event === "output" && msg.body) {
             setOutput(v => [...v, { type: msg.body.category || 'stdout', text: msg.body.output }])
          } else if (msg.type === "event" && msg.event === "dap_connected") {
             ws.send(JSON.stringify({
               seq: 1, type: "request", command: "initialize",
               arguments: { adapterID: "aeres", pathFormat: "path", linesStartAt1: true, columnsStartAt1: true }
             }))
          } else if (msg.type === "response" && msg.command === "initialize") {
             ws.send(JSON.stringify({
               seq: 2, type: "request", command: "launch",
               arguments: { program: activeTab.path, request: "launch", type: "python" }
             }))
          } else if (msg.type === "event" && msg.event === "initialized") {
             ws.send(JSON.stringify({ seq: 3, type: "request", command: "configurationDone" }))
          } else if (msg.type === "event" && msg.event === "terminated") {
             handleStop()
          } else if (msg.type === "event" && msg.event === "stopped") {
             setOutput(v => [...v, { type: 'system', text: `Debugger Paused on Breakpoint.` }])
          }
        } catch(err) {}
      }
      
      ws.onclose = () => {
         handleStop()
      }
      
      useStore.getState().setDebugState('running')
      
    } catch (err) {
      setOutput(v => [...v, { type: 'stderr', text: `ERROR: ${err.message}` }])
      setIsDebugging(false)
      setActiveAction(null)
    }
  }

  // Run in Terminal

  async function handleRunInTerminal() {
    if (!activeTab || !window.electron) return
    setActiveAction('run')
    try {
      let cmd = await detectFileCommand(activeTab.path, activeTab.content)
      if (!cmd) {
        cmd = await detectProjectCommand(rootPath)
      }
      if (!cmd) {
        setOutput(v => [...v, {
          type: 'stderr',
          text: `No run command detected for language: ${activeTab.language || 'unknown'}\nTry opening a project folder with a package.json or build file.`
        }])
        setActiveAction(null)
        return
      }
      if (cmd === 'open-browser') {
        window.electron.fs.openExternal?.(`file://${activeTab.path}`)
        setOutput(v => [...v, { type: 'system', text: <span className="flex items-center gap-1.5"><Globe size={10} /> Opening in browser: {activeTab.path}</span> }])
        setActiveAction(null)
        return
      }
      setOutput([{ type: 'system', text: <span className="flex items-center gap-1.5"><Play size={10} /> RUN: {cmd}</span> }])
      await _runCommandInTerminal(cmd, activeTab)
    } catch (err) {
      setOutput(v => [...v, { type: 'stderr', text: `Run failed: ${err.message}` }])
    } finally {
      setActiveAction(null)
    }
  }

  // Run Tests

  async function handleRunTests() {
    if (!activeTab || !window.electron) return
    setActiveAction('test')
    try {
      const cmd = await detectTestCommand(activeTab.path, rootPath)
      if (!cmd) {
        setOutput(v => [...v, {
          type: 'stderr',
          text: `No test runner detected for: ${activeTab.language || 'unknown'}\nFramework expected: ${getTestFrameworkName(activeTab.language)}`
        }])
        setActiveAction(null)
        return
      }
      setOutput([{ type: 'system', text: <span className="flex items-center gap-1.5"><FlaskConical size={10} /> TEST: {cmd}</span> }])
      await _runCommandInTerminal(cmd, activeTab)
    } catch (err) {
      setOutput(v => [...v, { type: 'stderr', text: `Test run failed: ${err.message}` }])
    } finally {
      setActiveAction(null)
    }
  }

  async function _runCommandInTerminal(cmd, tab) {
    const store = useStore.getState()
    const termName = activeAction === 'test' ? 'Test Runner' : 'Runner'
    let termId = store.terminals.find(t => t.name === termName)?.id
    if (!termId) {
      const dir = tab.path.includes('\\')
        ? tab.path.substring(0, tab.path.lastIndexOf('\\'))
        : tab.path.substring(0, tab.path.lastIndexOf('/'))
      const { id } = await window.electron.terminal.create({ cwd: dir || rootPath })
      store.addTerminal({ id, name: termName })
      termId = id
    }
    store.setActiveTerminalId(termId)
    store.setTerminalPanelOpen(true)
    // Small delay to let terminal initialize
    setTimeout(() => {
      window.electron.terminal.write(termId, cmd + '\r')
    }, 250)
  }

  async function handleStop() {
    const store = useStore.getState()
    if (dapWs) {
      dapWs.close()
      setDapWs(null)
    }
    if (store.activeTerminalId && activeAction !== 'debug') {
      window.electron?.terminal?.write(store.activeTerminalId, '\x03')
    }
    store.setDebugState('idle')
    store.setDebugSession(null)
    setIsRunning(false)
    setIsDebugging(false)
    setActiveAction(null)
  }

  if (!activeTab) return (
    <div className="p-8 text-center text-aeres-muted text-sm">Open a file to start a run or debug session.</div>
  )

  const lang = activeTab.language || detectLanguage(activeTab.name) || 'unknown'
  const testFramework = getTestFrameworkName(lang)
  const debugHint = DEBUG_HINTS[lang]
  const isActive = activeAction !== null

  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      {/* Header with language + framework info */}
      <div className="p-3 border-b border-aeres-border bg-aeres-surface/40">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Run & Debug</h3>
          <div className="flex gap-1">
            <span className="text-[9px] font-mono bg-aeres-violet/20 text-aeres-violet border border-aeres-violet/30 px-1.5 py-0.5 rounded">{lang}</span>
            <span className="text-[9px] font-mono bg-aeres-surface text-aeres-muted border border-aeres-border px-1.5 py-0.5 rounded">{testFramework}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          {/* Run in Terminal */}
          <button
            onClick={handleRunInTerminal}
            disabled={isActive}
            title={`Run ${activeTab.name} in terminal`}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold bg-emerald-900/30 hover:bg-emerald-700 text-emerald-400 hover:text-white border border-emerald-800/40 transition-colors rounded disabled:opacity-40"
          >
            {activeAction === 'run' ? (
              <><Loader size={10} className="animate-spin" /> Running...</>
            ) : (
              <><Play size={10} /> Run</>
            )}
          </button>

          {/* Debug */}
          <button
            onClick={isDebugging ? handleStop : handleLaunch}
            disabled={isActive && activeAction !== 'debug'}
            title={isDebugging ? 'Stop debug session' : `Debug ${activeTab.name}`}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold border transition-colors rounded disabled:opacity-40 ${
              isDebugging
                ? 'bg-red-900/40 hover:bg-red-700 text-red-400 hover:text-white border-red-800/40'
                : 'bg-aeres-violet/20 hover:bg-aeres-violet text-aeres-violet hover:text-white border-aeres-violet/30'
            }`}
          >
            {isDebugging
              ? <><Square size={10} /> Stop</>
              : activeAction === 'debug'
                ? <><Loader size={10} className="animate-spin" /> Launching...</>
                : <><Bug size={10} /> Debug</>
            }
          </button>

          {/* Run Tests */}
          <button
            onClick={handleRunTests}
            disabled={isActive}
            title={`Run tests using ${testFramework}`}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold bg-amber-900/30 hover:bg-amber-700 text-amber-400 hover:text-white border border-amber-800/40 transition-colors rounded disabled:opacity-40"
          >
            {activeAction === 'test' ? (
              <><Loader size={10} className="animate-spin" /> Testing...</>
            ) : (
              <><FlaskConical size={10} /> Test</>
            )}
          </button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed selection:bg-aeres-violet/40 no-scrollbar relative min-h-[120px]"
      >
        {output.map((line, i) => (
          <div key={i} className={
            line.type === 'stderr' ? 'text-red-400' :
            line.type === 'system' ? 'text-aeres-violet font-bold' :
            'text-aeres-text'
          }>
            {line.text}
          </div>
        ))}

        {output.length === 0 && (
          <div className="text-center text-aeres-muted opacity-30 mt-8">
            <div className="flex justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-aeres-violet/50"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div className="text-[10px] uppercase tracking-widest">Ready</div>
          </div>
        )}

        {/* Evaluate expression input when debug session active */}
        {isDebugging && (
          <div className="sticky bottom-0 left-0 right-0 bg-aeres-bg/90 backdrop-blur border-t border-white/5 p-1 mt-4">
            <input
              type="text"
              placeholder="> Evaluate expression..."
              className="w-full bg-transparent border-none outline-none text-[10px] text-aeres-violet placeholder:text-aeres-muted"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const cmd = e.target.value.trim()
                  if (!cmd) return
                  setOutput(v => [...v, { type: 'system', text: `> ${cmd}` }])
                  e.target.value = ''
                  try {
                    const store = useStore.getState()
                    if (store.debugSession) {
                      const result = await window.electron.debug.evaluate(store.debugSession, cmd, null)
                      if (result?.result) {
                        setOutput(v => [...v, { type: 'stdout', text: result.result }])
                      }
                    } else if (store.activeTerminalId) {
                      // Fallback: send input directly to the running terminal debugger (like node inspect or pdb)
                      window.electron.terminal.write(store.activeTerminalId, cmd + '\r')
                    }
                  } catch (err) {
                    setOutput(v => [...v, { type: 'stderr', text: `Error: ${err.message}` }])
                  }
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Variables & Call Stack */}
      <div className="p-3 bg-aeres-surface/20 border-t border-aeres-border space-y-3">
        {/* Debug adapter hint */}
        {debugHint && !isDebugging && (
          <div className="flex items-center gap-1.5 text-[9px] text-aeres-muted/60 italic bg-aeres-surface/30 rounded px-2 py-1.5 border border-aeres-border/50">
            <Lightbulb size={10} /> Debug adapter: <span className="text-aeres-violet font-mono">{debugHint.adapter}</span> — {debugHint.install}
          </div>
        )}

        {/* Variables Section */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase text-aeres-muted font-bold tracking-tight">Variables</span>
            <span className="text-[9px] text-aeres-muted/50">{variables.locals.length} locals</span>
          </div>
          <div className="max-h-36 overflow-y-auto bg-aeres-bg/60 rounded border border-aeres-border p-2 space-y-1 no-scrollbar">
            {variables.locals.length > 0 ? (
              variables.locals.map((v, i) => (
                <div key={i} className="flex justify-between text-[10px] font-mono border-b border-white/5 pb-1">
                  <span className="text-aeres-violet">{v.name}</span>
                  <span className="text-aeres-text truncate ml-2 max-w-[140px]" title={v.value}>{v.value}</span>
                </div>
              ))
            ) : (
              <div className="text-[9px] text-aeres-muted text-center py-2 italic">No variables — start a debug session.</div>
            )}
          </div>
        </div>

        {/* Call Stack Section */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase text-aeres-muted font-bold tracking-tight">Call Stack</span>
            <span className="text-[9px] text-aeres-muted/50">{callStack.length} frames</span>
          </div>
          <div className="max-h-28 overflow-y-auto bg-aeres-bg/60 rounded border border-aeres-border p-1 space-y-1 no-scrollbar">
            {callStack.length > 0 ? (
              callStack.map((f, i) => (
                <div key={i} className={`p-1.5 rounded text-[10px] cursor-pointer transition ${i === 0 ? 'bg-aeres-violet/20 text-white' : 'hover:bg-white/5 text-aeres-muted'}`}>
                  <div className="font-bold truncate">{f.name}</div>
                  <div className="text-[8px] opacity-60 truncate">{f.file}:{f.line}</div>
                </div>
              ))
            ) : (
              <div className="text-[9px] text-aeres-muted text-center py-2 italic">Stack trace unavailable.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
