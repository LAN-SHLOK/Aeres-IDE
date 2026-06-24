import React, { useEffect, useState } from 'react'
import { Save, XCircle, AlertTriangle, Heart, Package, Zap, Bot } from 'lucide-react'
import { useStore } from '../store.js'

export default function StatusBar() {
  const gitStatus = useStore((s) => s.gitStatus)
  const diagnostics = useStore((s) => s.diagnostics)
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const gitTask = useStore((s) => s.gitTask)
  const backendUrl = useStore((s) => s.backendUrl)
  const cursorLine = useStore((s) => s.cursorLine || 1)
  const cursorColumn = useStore((s) => s.cursorColumn || 1)
  const selectedCount = useStore((s) => s.selectedCount || 0)
  const selectedLinesCount = useStore((s) => s.selectedLinesCount || 0)
  
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [backendStatus, setBackendStatus] = useState('Offline')
  const lspStatus = useStore((s) => s.lspStatus)
  
  const rootPath = useStore((s) => s.rootPath)
  const activeEnvironment = useStore((s) => s.activeEnvironment)
  const setEnvSelectorOpen = useStore((s) => s.setEnvSelectorOpen)
  const refreshEnvironments = useStore((s) => s.refreshEnvironments)

  useEffect(() => {
    if (rootPath) {
      refreshEnvironments()
    }
  }, [rootPath, refreshEnvironments])

  useEffect(() => {
    if (!backendUrl) {
      setBackendStatus('Offline')
      return
    }

    let isMounted = true
    const checkHealth = async () => {
      try {
        const resp = await fetch(`${backendUrl}/api/health`)
        if (resp.ok && isMounted) {
          setBackendStatus('Connected')
        } else if (isMounted) {
          setBackendStatus('Offline')
        }
      } catch {
        if (isMounted) setBackendStatus('Offline')
      }
    }

    checkHealth()
    const int = setInterval(checkHealth, 5000)

    return () => {
      isMounted = false
      clearInterval(int)
    }
  }, [backendUrl])

  // Count errors and warnings
  const allDiags = Object.values(diagnostics).flat()
  const errorCount = allDiags.filter((d) => (d?.severity || '').toLowerCase() === 'error').length
  const warningCount = allDiags.filter((d) => (d?.severity || '').toLowerCase() === 'warning').length

  const theme = useStore((s) => s.theme)
  const isCutie = theme?.startsWith('cutie')

  if (isCutie) {
    return (
      <div className="flex h-7 shrink-0 items-center justify-between px-4 mx-2 mb-2 text-[10px] font-bold text-black select-none border-2.5 border-black rounded-full shadow-[2px_2px_0px_#000]"
           style={{
             backgroundSize: '16px 16px',
             backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
             backgroundColor: theme === 'cutie-dark' ? '#ffb3c1' : '#ff8ba7'
           }}>
        {/* Left */}
        <div className="flex items-center h-full gap-4">
          <button className="flex items-center gap-1 hover:opacity-80 transition-opacity text-black">
            <Save size={12} className="shrink-0" />
            <span className="leading-none text-black font-black">{gitStatus.branch || 'main'}</span>
          </button>

          {gitTask && (
             <div className="flex items-center gap-1.5 text-black">
               <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
               <span className="font-bold">{gitTask}</span>
             </div>
          )}
          
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-0.5 px-1 bg-red-400 border border-black rounded-md shadow-[2px_2px_0px_#000] text-black">
              <XCircle size={10} className="shrink-0" /> {errorCount}
            </button>
            <button className="flex items-center gap-0.5 px-1 bg-yellow-400 border border-black rounded-md shadow-[2px_2px_0px_#000] text-black">
              <AlertTriangle size={10} className="shrink-0" /> {warningCount}
            </button>
          </div>
        </div>

        {/* Center */}
        <div className="flex items-center h-full">
        </div>

        {/* Right */}
        <div className="flex items-center h-full gap-4">
          {activeTab && (
            <div className="flex items-center gap-3">
              <span>
                Ln {cursorLine}, Col {cursorColumn}
                {selectedCount > 0 && ` (${selectedLinesCount > 0 ? `${selectedLinesCount} lines, ` : ''}${selectedCount} selected)`}
              </span>
              <span>UTF-8</span>
              <span className="capitalize px-1.5 py-0.5 bg-white border border-black rounded-md font-mono">{activeTab.language || 'plaintext'}</span>
            </div>
          )}
          
          <button 
            onClick={() => setEnvSelectorOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-200 border border-black rounded-md text-black hover:bg-indigo-300"
          >
             <Package size={10} className="shrink-0" />
             <span className="font-black text-[9px]">{activeEnvironment?.name || 'No Env'}</span>
          </button>
          
          {activeTab && lspStatus[activeTab.language] && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-black rounded-md text-black">
               <Zap size={10} className="animate-bounce shrink-0 fill-current text-yellow-500" />
               <span className="capitalize font-black text-[9px]">LSP: {lspStatus[activeTab.language]}</span>
            </div>
          )}

          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#a7f3d0] border border-black rounded-md shadow-[2px_2px_0px_#000] text-black">
            <Bot size={10} className="shrink-0" />
            <span className="font-black tracking-wide uppercase text-[8px]">{backendStatus === 'Connected' ? 'Aeres Sync' : 'Offline'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-5 shrink-0 items-center justify-between px-3 text-[10px] font-medium text-slate-500 select-none border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
      {/* Left */}
      <div className="flex items-center h-full gap-4">
        <button className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
          <span className="leading-none">{gitStatus.branch || 'main'}</span>
        </button>

        {gitTask && (
           <div className="flex items-center gap-2 text-white/90">
             <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
             <span>{gitTask}</span>
           </div>
        )}
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 hover:text-slate-300 transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {errorCount}
          </button>
          <button className="flex items-center gap-1 hover:text-slate-300 transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {warningCount}
          </button>
        </div>
      </div>

      {/* Center */}
      <div className="flex items-center h-full">
      </div>

      {/* Right */}
      <div className="flex items-center h-full gap-4">
        {activeTab && (
          <div className="flex items-center gap-4">
            <span>
              Ln {cursorLine}, Col {cursorColumn}
              {selectedCount > 0 && ` (${selectedLinesCount > 0 ? `${selectedLinesCount} lines, ` : ''}${selectedCount} selected)`}
            </span>
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span className="capitalize">{activeTab.language || 'plaintext'}</span>
          </div>
        )}
        
        <button 
          onClick={() => setEnvSelectorOpen(true)}
          className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
          <span className="capitalize">{activeEnvironment?.name || 'Select Env'}</span>
        </button>
        
        {activeTab && lspStatus[activeTab.language] && (
          <div className="flex items-center gap-1.5">
             <div className={`h-1.5 w-1.5 rounded-full ${
               lspStatus[activeTab.language] === 'ready' ? 'bg-emerald-400' :
               lspStatus[activeTab.language] === 'initializing' ? 'bg-amber-400 animate-pulse' :
               'bg-rose-400'
             }`} />
             <span className="capitalize opacity-80">LSP: {lspStatus[activeTab.language]}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${
            backendStatus === 'Connected' ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
          }`} />
          <span className="font-bold tracking-wide uppercase text-[9px]">{backendStatus === 'Connected' ? 'Aeres Sync' : 'Sync offline'}</span>
        </div>
      </div>
    </div>
  )
}
