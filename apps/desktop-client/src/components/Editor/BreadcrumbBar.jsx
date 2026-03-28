import { useStore } from '../../store.js'

export default function BreadcrumbBar({ path }) {
  if (!path) return null
  const parts = path.split(/[\\/]/).filter(Boolean)
  
  return (
    <div className="flex items-center h-7 px-3 bg-aether-bg text-[10.5px] font-mono text-aether-muted border-b border-aether-border overflow-x-auto no-scrollbar whitespace-nowrap">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center group">
          <span className={`px-1 rounded transition-colors ${i === parts.length - 1 ? 'text-aether-text font-medium' : 'hover:bg-aether-surface/60 hover:text-aether-text cursor-pointer'}`}>
            {part}
          </span>
          {i < parts.length - 1 && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 mx-0.5 group-hover:opacity-100">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          )}
        </span>
      ))}
    </div>
  )
}
