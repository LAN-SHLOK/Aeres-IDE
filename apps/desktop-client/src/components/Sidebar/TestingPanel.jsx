import React, { useState } from 'react'
import { useStore } from '../../store.js'
import { Play, RotateCw, CheckCircle2, XCircle, FlaskConical, AlertCircle } from 'lucide-react'
import { detectTestCommand, getTestFrameworkName } from '../../utils/projectRunner.js'

export default function TestingPanel() {
  const rootPath = useStore((s) => s.rootPath)
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState([])
  const [framework, setFramework] = useState(null)

  const handleRunTests = async () => {
    if (!activeTab || !window.electron) return
    setRunning(true)
    setOutput([])

    try {
      const detectedFramework = getTestFrameworkName(activeTab.language)
      setFramework(detectedFramework)

      const cmd = await detectTestCommand(activeTab.path, rootPath)
      if (!cmd) {
        setOutput(v => [...v, { type: 'error', text: `No test runner detected for: ${activeTab.language || 'unknown'}` }])
        setRunning(false)
        return
      }

      setOutput(v => [...v, { type: 'info', text: `Running tests using ${detectedFramework}...` }])
      
      const store = useStore.getState()
      let termId = store.terminals.find(t => t.name === 'Test Runner')?.id
      if (!termId) {
        const dir = activeTab.path.includes('\\')
          ? activeTab.path.substring(0, activeTab.path.lastIndexOf('\\'))
          : activeTab.path.substring(0, activeTab.path.lastIndexOf('/'))
        const { id } = await window.electron.terminal.create({ cwd: dir || rootPath })
        store.addTerminal({ id, name: 'Test Runner' })
        termId = id
        store.setActiveTerminalId(id)
        store.setTerminalPanelOpen(true)
      } else {
        store.setActiveTerminalId(termId)
        store.setTerminalPanelOpen(true)
      }

      // Write command to terminal
      await window.electron.terminal.write(termId, `${cmd}\r`)
      
      setOutput(v => [...v, { type: 'success', text: `Tests triggered in terminal. View terminal for detailed output.` }])
    } catch (e) {
      setOutput(v => [...v, { type: 'error', text: `Failed to run tests: ${e.message}` }])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-800/50 px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Testing</span>
        <button 
          onClick={handleRunTests}
          disabled={running || !activeTab}
          className="rounded px-1.5 py-0.5 text-[10px] capitalize text-slate-400 hover:text-white transition disabled:opacity-50"
        >
          {running ? <RotateCw className="animate-spin w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {!activeTab ? (
          <div className="flex flex-col items-center justify-center text-center text-slate-500 mt-10">
            <FlaskConical className="w-8 h-8 opacity-40 mb-2" />
            <span className="text-xs">Open a file to discover tests</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900/50 rounded p-3 border border-slate-800">
              <h3 className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-2">
                <FlaskConical className="w-3 h-3 text-violet-400" />
                Active File Tests
              </h3>
              <p className="text-[10px] text-slate-500 mb-3 break-all">{activeTab.name}</p>
              
              <button
                onClick={handleRunTests}
                disabled={running}
                className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {running ? <RotateCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {running ? 'Running Tests...' : 'Run Tests in Current File'}
              </button>
            </div>

            {output.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">Status</h4>
                {output.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded text-[11px] ${
                    msg.type === 'error' ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 
                    msg.type === 'success' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50' : 
                    'bg-slate-800/30 text-slate-300 border border-slate-700/50'
                  }`}>
                    {msg.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    {msg.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    {msg.type === 'info' && <FlaskConical className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    <span className="leading-relaxed">{msg.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
