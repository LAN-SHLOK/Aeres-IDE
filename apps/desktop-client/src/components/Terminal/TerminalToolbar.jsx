export default function TerminalToolbar({ terminalId, onKill }) {
  const handleClear = () => {
    const e = window.electron
    if (!e) return
    const cmd = window.electron.platform === 'win32' ? 'cls\r' : 'clear\r'
    e.terminal.write(terminalId, cmd)
  }

  return (
    <div className="flex h-7 shrink-0 items-center gap-1 border-b border-aether-border bg-aether-surface px-2">
      <button
        type="button"
        onClick={handleClear}
        className="rounded px-2 py-0.5 text-[10px] text-aether-muted transition hover:text-aether-text"
        title="Clear"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={onKill}
        className="rounded px-2 py-0.5 text-[10px] text-aether-muted transition hover:text-red-400"
        title="Kill"
      >
        Kill
      </button>
    </div>
  )
}
