import React, { useEffect, useRef, useState, useCallback } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { CheckCircle2, XCircle, Loader2, FileCode2, PlayCircle, AlertTriangle } from 'lucide-react'
import { useStore } from '../../store.js'

export default function BatchModernizeView() {
  const batchState = useStore(s => s.batchModernizeState)
  const setBatchStatus = useStore(s => s.setBatchModernizeFileStatus)
  const cancelBatch = useStore(s => s.cancelBatchModernize)
  const setBatchState = useStore(s => s.setBatchModernizeState)
  const theme = useStore(s => s.theme)
  const editorSettings = useStore(s => s.editorSettings)
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  
  const currentFile = batchState?.files[activeFileIndex]
  const isAllDone = batchState?.files.every(f => f.status === 'accepted' || f.status === 'rejected' || f.status === 'error')

  // Run modernization pipeline for the current file if it's pending
  useEffect(() => {
    if (!currentFile || !window.electron) return
    
    let isCancelled = false

    const runPipeline = async () => {
      if (currentFile.status !== 'pending') return

      try {
        setBatchStatus(activeFileIndex, 'modernizing')
        
        // 1. Read Original
        const originalContent = await window.electron.fs.readFile(currentFile.path)
        setBatchStatus(activeFileIndex, 'modernizing', { originalCode: originalContent, fixedCode: '' })

        // 2. Setup Stream Listener
        window.electron.analyze.onStream((chunk) => {
          if (isCancelled) return
          if (!chunk) return
          
          if (chunk.type === 'done' || chunk.type === 'no_deprecations') {
            setBatchStatus(activeFileIndex, 'review')
          } else if (chunk.type === 'error') {
            setBatchStatus(activeFileIndex, 'error', { errorMsg: chunk.message || 'Error occurred' })
          } else if (chunk.type === 'code_chunk') {
            // we use a functional update pattern by pulling current state
            const currentCode = useStore.getState().batchModernizeState.files[activeFileIndex].fixedCode || ''
            setBatchStatus(activeFileIndex, 'modernizing', { fixedCode: chunk.content }) // chunk.content has full code for AST replaces
          }
        })

        // 3. Start Analysis
        await window.electron.analyze.modernize(originalContent, currentFile.path)
      } catch (err) {
        if (!isCancelled) {
          console.error('[BatchModernize] error:', err)
          setBatchStatus(activeFileIndex, 'error', { errorMsg: err.message })
        }
      }
    }

    runPipeline()

    return () => { isCancelled = true }
  }, [currentFile?.path, currentFile?.status, activeFileIndex, setBatchStatus])

  const handleAccept = useCallback(async () => {
    if (!currentFile || !window.electron) return
    try {
      if (currentFile.fixedCode) {
        await window.electron.fs.writeFile(currentFile.path, currentFile.fixedCode)
      }
      setBatchStatus(activeFileIndex, 'accepted')
      if (activeFileIndex < batchState.files.length - 1) {
        setActiveFileIndex(i => i + 1)
      }
    } catch (err) {
      console.error('Save error:', err)
    }
  }, [currentFile, activeFileIndex, batchState, setBatchStatus])

  const handleReject = useCallback(() => {
    setBatchStatus(activeFileIndex, 'rejected')
    if (activeFileIndex < batchState.files.length - 1) {
      setActiveFileIndex(i => i + 1)
    }
  }, [activeFileIndex, batchState, setBatchStatus])

  if (!batchState) return null

  return (
    <div className="flex h-full w-full bg-aeres-bg text-aeres-fg overflow-hidden">
      {/* Left Sidebar - Files List */}
      <div className="w-64 shrink-0 border-r border-aeres-border bg-aeres-surface flex flex-col h-full">
        <div className="p-3 border-b border-aeres-border bg-black/10">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="text-aeres-violet">⚡</span> Batch Modernize
          </h3>
          <p className="text-[10px] text-aeres-muted">Dep: <span className="font-mono text-aeres-blue">{batchState.depName}</span></p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {batchState.files.map((file, idx) => {
            const isActive = idx === activeFileIndex
            const isPending = file.status === 'pending'
            const isModernizing = file.status === 'modernizing'
            const isReview = file.status === 'review'
            const isAccepted = file.status === 'accepted'
            const isRejected = file.status === 'rejected'
            const isError = file.status === 'error'

            return (
              <button
                key={file.path}
                onClick={() => setActiveFileIndex(idx)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-aeres-border/50 transition-colors ${
                  isActive ? 'bg-aeres-violet/10 border-l-2 border-l-aeres-violet' : 'hover:bg-aeres-surface/80 border-l-2 border-l-transparent'
                }`}
              >
                <div className="shrink-0 flex items-center justify-center w-4 h-4">
                  {isPending && <PlayCircle size={12} className="text-aeres-muted" />}
                  {isModernizing && <Loader2 size={12} className="text-aeres-blue animate-spin" />}
                  {isReview && <FileCode2 size={12} className="text-amber-400" />}
                  {isAccepted && <CheckCircle2 size={12} className="text-green-500" />}
                  {isRejected && <XCircle size={12} className="text-red-500" />}
                  {isError && <AlertTriangle size={12} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] truncate font-mono ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {file.path.split(/[\\/]/).pop()}
                  </div>
                  <div className="text-[9px] text-aeres-muted truncate">
                    {file.status.toUpperCase()}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-3 border-t border-aeres-border bg-black/10 flex flex-col gap-2">
           <button onClick={cancelBatch} className="w-full py-1.5 text-[10px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition">
             {isAllDone ? 'Done & Close' : 'Cancel Batch'}
           </button>
        </div>
      </div>

      {/* Main Diff Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {/* Top Header */}
        <div className="h-10 border-b border-aeres-border bg-aeres-surface flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
           <div className="text-xs font-mono text-slate-300 truncate">
             {currentFile ? currentFile.path : 'No file selected'}
           </div>
           
           {currentFile && currentFile.status === 'review' && (
             <div className="flex items-center gap-2">
               <button onClick={handleReject} className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-[11px] font-bold">
                 <XCircle size={12} /> Reject
               </button>
               <button onClick={handleAccept} className="flex items-center gap-1.5 px-4 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition text-[11px] font-bold">
                 <CheckCircle2 size={12} /> Accept Change
               </button>
             </div>
           )}
           {currentFile && currentFile.status === 'accepted' && <span className="text-[11px] font-bold text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> ACCEPTED</span>}
           {currentFile && currentFile.status === 'rejected' && <span className="text-[11px] font-bold text-red-500 flex items-center gap-1"><XCircle size={12}/> REJECTED</span>}
        </div>

        {/* Diff Editor */}
        <div className="flex-1 min-h-0 relative">
          {currentFile && (currentFile.status === 'modernizing' || currentFile.status === 'review' || currentFile.status === 'accepted' || currentFile.status === 'rejected') ? (
            <DiffEditor
              height="100%"
              original={currentFile.originalCode || ''}
              modified={currentFile.fixedCode || currentFile.originalCode || ''}
              language={currentFile.path.split('.').pop() === 'js' || currentFile.path.split('.').pop() === 'jsx' ? 'javascript' : currentFile.path.split('.').pop() === 'py' ? 'python' : 'typescript'}
              theme={theme?.includes('light') ? 'vs' : 'vs-dark'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: editorSettings.fontSize,
                fontFamily: editorSettings.fontFamily,
                lineHeight: editorSettings.lineHeight,
                renderSideBySide: true,
                fixedOverflowWidgets: true
              }}
            />
          ) : currentFile && currentFile.status === 'pending' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
               <PlayCircle size={32} className="mb-2 opacity-50" />
               <p className="text-xs">Waiting in queue...</p>
            </div>
          ) : currentFile && currentFile.status === 'error' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500">
               <AlertTriangle size={32} className="mb-2 opacity-50" />
               <p className="text-xs font-bold">Failed to process file</p>
               <p className="text-[10px] mt-1 text-red-400/70 max-w-sm text-center">{currentFile.errorMsg}</p>
            </div>
          ) : (
             <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
               Select a file to view diff
             </div>
          )}

          {/* Loading Overlay */}
          {currentFile && currentFile.status === 'modernizing' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 pointer-events-none">
               <Loader2 size={32} className="text-aeres-violet animate-spin mb-3" />
               <p className="text-sm font-bold text-white shadow-black drop-shadow-md">AI Modernizing Code...</p>
               <p className="text-[10px] text-slate-300 mt-1 shadow-black drop-shadow-md">Analyzing AST & applying migrations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
