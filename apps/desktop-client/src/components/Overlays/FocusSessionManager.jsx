import React, { useEffect, useState } from 'react'
import { useStore } from '../../store.js'

export default function FocusSessionManager() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('restore') // 'save' or 'restore'

  async function fetchSessions() {
    if (!window.electron) return
    setLoading(true)
    const list = await window.electron.sessions.list()
    setSessions(list || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  async function handleSave() {
    if (!newName) return
    setIsSaving(true)
    try {
      const s = useStore.getState()
      // Only send serializable data, exclude functions/actions
      const serializableState = {
        tabs: s.tabs,
        activeTabId: s.activeTabId,
        rootPath: s.rootPath,
        sidebarWidth: s.sidebarWidth,
        rightPanelWidth: s.rightPanelWidth,
        terminalPanelHeight: s.terminalPanelHeight,
        activeSidebarTab: s.activeSidebarTab,
        activeRightTab: s.activeRightTab,
        chatMessages: s.chatMessages,
        savedAt: Date.now()
      }
      
      const result = await Promise.race([
        window.electron.sessions.save(newName, serializableState),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Session save timed out')), 10000))
      ])
      
      if (result) {
        setNewName('')
        setActiveTab('restore')
        fetchSessions()
      }
    } catch (err) {
      console.error('[FocusSession] save error:', err)
      const store = useStore.getState();
      store.appendOutputLog('error', `Failed to save session: ${err.message}`);
      store.setActiveSidebarTab('output');
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRestore(id) {
    if (!window.confirm('Restore session? Unsaved changes in your current view will be lost.')) return
    const state = await window.electron.sessions.load(id)
    if (state) {
      // Re-hydrate the store
      useStore.setState({
        tabs: state.tabs || [],
        activeTabId: state.activeTabId,
        rootPath: state.rootPath,
        sidebarWidth: state.sidebarWidth,
        rightPanelWidth: state.rightPanelWidth,
        terminalPanelHeight: state.terminalPanelHeight,
        activeSidebarTab: state.activeSidebarTab,
        activeRightTab: state.activeRightTab,
        chatMessages: state.chatMessages || []
      })
      // Close manager
      useStore.setState({ activeSidebarTab: 'files' })
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    await window.electron.sessions.delete(id)
    fetchSessions()
  }

  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      <div className="p-3 border-b border-aeres-border flex justify-between items-center bg-aeres-surface/40">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Focus Sessions</h3>
        <div className="flex bg-aeres-border rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('restore')}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === 'restore' ? 'bg-aeres-violet text-white shadow-sm' : 'text-aeres-muted hover:text-white'}`}
          >
            RESTORE
          </button>
          <button
            onClick={() => {
                setActiveTab('save')
                setNewName(useStore.getState().gitStatus?.branch || 'my-session')
            }}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === 'save' ? 'bg-aeres-violet text-white shadow-sm' : 'text-aeres-muted hover:text-white'}`}
          >
            SAVE
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'restore' ? (
          <div className="p-2 space-y-2">
            {loading ? (
              <div className="p-8 text-center text-aeres-muted animate-pulse">Scanning context vault...</div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex justify-center mb-3">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aeres-violet/20"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p className="text-xs text-aeres-muted leading-relaxed">No sessions found. Save your current context to switch between features instantly.</p>
              </div>
            ) : (
              sessions.map(s => (
                <div key={s.id} className="group p-3 rounded-lg border border-aeres-border bg-aeres-surface/40 hover:border-aeres-violet/50 transition-all cursor-pointer" onClick={() => handleRestore(s.id)}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-white group-hover:text-aeres-violet transition-colors">{s.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-aeres-muted hover:text-aeres-red transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-aeres-muted">
                    <span className="font-mono text-aeres-blue">{s.rootPath?.split(/[/\\]/).pop()}</span>
                    <span>{new Date(s.savedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-aeres-muted uppercase tracking-widest pl-1">Session Identity</label>
              <input
                autoFocus
                type="text"
                placeholder="branch: feature/X"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full bg-aeres-surface border border-aeres-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-aeres-violet shadow-inner transition-colors"
              />
            </div>
            <div className="p-4 bg-aeres-violet/5 rounded-xl border border-aeres-violet/10 ring-1 ring-white/5 space-y-2">
              <h4 className="text-[10px] font-bold text-aeres-violet uppercase">Snapshot Preview</h4>
              <ul className="text-[11px] text-aeres-text/70 space-y-1 ml-4 list-disc marker:text-aeres-violet">
                <li>Capture {useStore.getState().tabs.length} open tabs</li>
                <li>Preserve cursor positions & scroll offsets</li>
                <li>Snapshot {useStore.getState().chatMessages.length} AI chat messages</li>
                <li>Archive full layout & window state</li>
              </ul>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving || !newName}
              className="w-full py-2.5 bg-aeres-violet hover:bg-aeres-violet/90 text-white font-bold text-xs rounded-lg shadow-lg shadow-aeres-violet/20 disabled:opacity-50 transition-all scale-100 active:scale-95"
            >
              {isSaving ? 'ARCHIVING CONTEXT...' : 'CAPTURE SESSION'}
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-aeres-border bg-aeres-surface/20">
        <p className="text-[10px] leading-relaxed text-aeres-muted/70 italic text-center">
          "The fastest way to code is to never have to remember where you left off."
        </p>
      </div>
    </div>
  )
}
