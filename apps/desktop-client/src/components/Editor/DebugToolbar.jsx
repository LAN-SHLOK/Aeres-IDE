import React from 'react'
import { useStore } from '../../store.js'

export default function DebugToolbar() {
  const debugState = useStore((s) => s.debugState)
  const setDebugState = useStore((s) => s.setDebugState)

  if (debugState === 'idle') return null

  const handleContinue = () => window.electron.debug.continue()
  const handleStepOver = () => window.electron.debug.stepOver()
  const handleStepInto = () => window.electron.debug.stepInto()
  const handleStepOut = () => window.electron.debug.stepOut()
  const handleStop = () => window.electron.debug.stop()

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[4000] flex items-center gap-1 bg-aether-surface border border-aether-border rounded-lg shadow-2xl p-1 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-0.5 px-2 border-r border-aether-border mr-1">
        <span className="w-2 h-2 rounded-full bg-aether-violet animate-pulse mr-2" />
        <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Debug Session</span>
      </div>
      
      <button onClick={handleContinue} title="Continue (F5)" className="p-1.5 hover:bg-white/10 rounded transition text-blue-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button onClick={handleStepOver} title="Step Over (F10)" className="p-1.5 hover:bg-white/10 rounded transition text-blue-300">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h2V5H6v14zm3-7l9-7v14l-9-7z"/></svg>
      </button>
      <button onClick={handleStepInto} title="Step Into (F11)" className="p-1.5 hover:bg-white/10 rounded transition text-blue-300">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>
      </button>
      <button onClick={handleStepOut} title="Step Out (Shift+F11)" className="p-1.5 hover:bg-white/10 rounded transition text-blue-300 transform rotate-180">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>
      </button>
      <div className="w-px h-4 bg-aether-border mx-1" />
      <button onClick={handleStop} title="Stop (Shift+F5)" className="p-1.5 hover:bg-white/10 rounded transition text-red-500">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
      </button>
    </div>
  )
}
