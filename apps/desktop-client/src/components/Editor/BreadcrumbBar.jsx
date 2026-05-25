import { useStore } from '../../store.js'

export default function BreadcrumbBar({ path }) {
  if (!path) return null
  const parts = path.split(/[\\/]/).filter(Boolean)
  
  return (
    <div className="flex items-center h-full px-3 text-[11px] font-sans text-slate-500 overflow-x-auto no-scrollbar whitespace-nowrap">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center group">
          <span className={`px-1 rounded transition-colors ${i === parts.length - 1 ? 'text-slate-300' : 'hover:text-slate-200 cursor-pointer'}`}>
            {part}
          </span>
          {i < parts.length - 1 && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-20 mx-0.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          )}
        </span>
      ))}
    </div>
  )
}
