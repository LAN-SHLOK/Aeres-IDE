import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store.js'

export default function DebugConsole({ output, isRunning, onEvaluate }) {
  const [input, setInput] = useState('')
  const outputRef = useRef(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  return (
    <div className="flex flex-col h-full bg-aeres-bg border border-aeres-border rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-aeres-surface/40 border-b border-aeres-border flex justify-between">
         <span className="text-[10px] font-bold text-aeres-muted uppercase">Console Output</span>
      </div>
      <div ref={outputRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed selection:bg-aeres-violet/40 no-scrollbar">
        {output.map((line, i) => (
           <div key={i} className={`whitespace-pre-wrap ${line.type === 'stderr' ? 'text-aeres-red' : line.type === 'system' ? 'text-aeres-blue font-bold' : 'text-aeres-text'}`}>
             {line.text}
           </div>
        ))}
        {output.length === 0 && (
          <div className="text-center text-aeres-muted/50 mt-8 text-[10px] flex justify-center items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
            Awaiting process output...
          </div>
        )}
      </div>
      {isRunning && (
        <div className="bg-aeres-surface border-t border-aeres-border p-2">
           <div className="flex items-center gap-2 bg-aeres-bg border border-aeres-border rounded px-2 focus-within:border-aeres-violet transition-colors">
             <span className="text-aeres-violet text-[10px] font-bold">&gt;</span>
             <input 
               type="text" 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Evaluate expression..." 
               className="w-full bg-transparent border-none outline-none text-[11px] font-mono text-aeres-text placeholder:text-aeres-muted/50 py-1"
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && input.trim()) {
                   onEvaluate(input.trim())
                   setInput('')
                 }
               }}
             />
           </div>
        </div>
      )}
    </div>
  )
}
