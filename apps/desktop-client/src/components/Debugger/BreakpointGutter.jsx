import { useStore } from '../../store.js'

export default function BreakpointGutter({ line, hasBreakpoint, onClick }) {
  return (
    <div 
      className={`w-4 h-4 rounded-full flex items-center justify-center cursor-pointer transition-all ${
        hasBreakpoint ? 'bg-aeres-red/80 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-transparent hover:bg-white/10'
      }`}
      onClick={onClick}
      title={hasBreakpoint ? "Remove Breakpoint" : "Add Breakpoint"}
    >
      {hasBreakpoint && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
    </div>
  )
}
    