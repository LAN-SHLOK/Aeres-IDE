import React, { useEffect, useState } from 'react'
import { useStore } from '../../store.js'

export default function FocusSessionManager() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const currentSession = useStore((s) => s.currentSessionName)

  const loadSessions = async () => {
    setLoading(true)
    const list = await window.electron.sessions.list()
    setSessions(list)
    setLoading(false)
  }

  useEffect(() => {
    loadSessions()
    const handleReload = () => loadSessions()
    document.addEventListener('aeres:focus-sessions-updated', handleReload)
    return () => document.removeEventListener('aeres:focus-sessions-updated', handleReload)
  }, [])

  const handleRestore = async (id) => {
    await useStore.getState().restoreSession(id)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this session?')) {
      await window.electron.sessions.delete(id)
      loadSessions()
    }
  }

  const filtered = sessions.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rootPath?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      <div className="p-3 border-b border-aeres-border">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Focus Sessions</h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-aeres-violet"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && <div className="text-center py-4 text-aeres-muted text-xs">Loading sessions...</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-8 text-aeres-muted italic text-xs">
            No sessions found.
          </div>
        )}

        {filtered.map((s) => (
          <div 
            key={s.id} 
            className={`group mb-2 p-2 rounded-sm border transition-all ${
              currentSession === s.name ? 'bg-aeres-violet/10 border-aeres-violet/30' : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0" onClick={() => handleRestore(s.id)} style={{ cursor: 'pointer' }}>
                <div className="text-xs font-bold text-slate-200 truncate">{s.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(s.savedAt).toLocaleDateString()} · {s.rootPath?.split(/[/\\]/).pop()}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleDelete(s.id)}
                  className="p-1 text-slate-500 hover:text-red-400"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-slate-950/20 border-t border-aeres-border text-[10px] text-slate-500 italic">
        Tip: Press Ctrl+Shift+S to save your current IDE state.
      </div>
    </div>
  )
}
