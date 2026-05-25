import { useState, useEffect } from 'react'
import CallStack from './CallStack.jsx'
import VariableInspector from './VariableInspector.jsx'
import DebugConsole from './DebugConsole.jsx'
import { useStore } from '../../store.js'

export default function DebugPanel() {
  const debugSession = useStore((s) => s.debugSession)
  const [output, setOutput] = useState([])
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    const e = window.electron
    if (!e) return

    const offOutput = e.debug.onOutput((data) => {
      const text = typeof data === 'string' ? data : data.content || JSON.stringify(data)
      const type = data.category === 'stderr' ? 'stderr' : 'stdout'
      setOutput((v) => [...v, { type, text }].slice(-500))
    })

    const offStopped = e.debug.onStopped(() => {
      setIsRunning(false)
    })

    const offContinued = e.debug.onContinued(() => {
      setIsRunning(true)
    })

    const offTerminated = e.debug.onTerminated(() => {
      setIsRunning(false)
      setOutput((v) => [...v, { type: 'system', text: '--- SESSION TERMINATED ---' }])
    })

    return () => {
      offOutput()
      offStopped()
      offContinued()
      offTerminated()
    }
  }, [])

  // Track running state from debugSession changes
  useEffect(() => {
    if (debugSession) setIsRunning(true)
    else setIsRunning(false)
  }, [debugSession])

  const handleEvaluate = async (expression) => {
    if (!window.electron || !debugSession) return
    setOutput((v) => [...v, { type: 'system', text: `> ${expression}` }])
    try {
      // Fixed: use debug.evaluate instead of the non-existent debug.command
      const result = await window.electron.debug.evaluate(debugSession, expression, null)
      if (result?.result) {
        setOutput((v) => [...v, { type: 'stdout', text: result.result }])
      }
    } catch (err) {
      setOutput((v) => [...v, { type: 'stderr', text: `Error: ${err.message}` }])
    }
  }

  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      <div className="flex-1 overflow-hidden">
        <div className="h-1/2 border-b border-aeres-border overflow-hidden">
          <VariableInspector />
        </div>
        <div className="h-1/2 overflow-hidden">
          <CallStack />
        </div>
      </div>
      {/* Fixed: pass required props to DebugConsole */}
      <div className="h-1/3 border-t border-aeres-border">
        <DebugConsole
          output={output}
          isRunning={isRunning}
          onEvaluate={handleEvaluate}
        />
      </div>
    </div>
  )
}
