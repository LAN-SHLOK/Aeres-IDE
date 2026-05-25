export default function StagingArea({ file, onUnstage, onDiff }) {
  const name = file.path.split(/[\\/]/).pop()
  return (
    <div 
      className="flex items-center justify-between p-1.5 px-3 hover:bg-aeres-surface/40 transition-colors cursor-pointer group rounded"
      onClick={() => onDiff && onDiff(file.path, true)}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs text-green-400 font-medium truncate">{name}</span>
        <span className="text-[9px] text-aeres-muted truncate opacity-80">{file.path}</span>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onUnstage && onUnstage(file.path); }}
        className="text-aeres-muted hover:text-aeres-red p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Unstage file"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  )
}
