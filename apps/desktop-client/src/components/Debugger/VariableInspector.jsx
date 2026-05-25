import { useStore } from '../../store.js'

export default function VariableInspector() {
  const variables = useStore((s) => s.variables)

  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      <div className="flex justify-between items-center mb-2 px-3 py-2 border-b border-aeres-border">
        <span className="text-[10px] uppercase text-aeres-muted font-bold tracking-tight">Variables</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 no-scrollbar">
        {variables && variables.locals && variables.locals.length > 0 ? (
          variables.locals.map((v, i) => (
            <div key={i} className="flex flex-col text-[10.5px] font-mono border border-white/5 bg-aeres-surface/30 rounded p-1.5 hover:bg-aeres-surface/60 transition-colors group">
              <span className="text-aeres-violet group-hover:text-aeres-blue transition-colors mb-0.5">{v.name}</span>
              <span className="text-aeres-text truncate opacity-90 pl-2 border-l border-aeres-border">{v.value}</span>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
             <span className="text-[10px] text-aeres-muted italic text-center">No local variables available in the current scope.</span>
          </div>
        )}
      </div>
    </div>
  )
}
