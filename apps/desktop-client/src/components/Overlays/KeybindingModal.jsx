import { useEffect } from 'react'

export default function KeybindingModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const shortcuts = [
    { key: "Ctrl + S", action: "Save File" },
    { key: "Ctrl + O", action: "Open Folder" },
    { key: "Ctrl + ` ", action: "Toggle Terminal" },
    { key: "Ctrl + Shift + P", action: "Command Palette" },
    { key: "Ctrl + P", action: "Quick Open File" },
    { key: "Ctrl + Shift + F", action: "Global Search" },
    { key: "Ctrl + Shift + M", action: "Modernize AI Agent" },
    { key: "Ctrl + Shift + E", action: "Explorer Sidebar" },
    { key: "Ctrl + Shift + G", action: "Git Source Control" },
    { key: "Ctrl + Shift + D", action: "Debug Panel" }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-[500px] bg-[#1e1e1e] border border-aeres-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#252526]">
          <h2 className="text-sm font-semibold text-white tracking-wide">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-aeres-muted flex items-center justify-center hover:text-white transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
          {shortcuts.map(s => (
            <div key={s.action} className="flex justify-between items-center text-xs">
              <span className="text-aeres-muted">{s.action}</span>
              <span className="bg-[#2d2d2d] text-aeres-blue px-2 py-0.5 rounded font-mono border border-[#3d3d3d] shadow-sm">{s.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
