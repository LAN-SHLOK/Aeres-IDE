import { useCallback, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store.js'
import { detectLanguage } from '../../utils/langDetect.js'
import { openFolderAndResetTerminals } from '../../utils/workspaceActions.js'
import { getFileIcon } from '../../utils/getFileIcon.jsx'
import { Trash2, FolderOpen, Folder } from 'lucide-react'


function InlineInputRow({ depth, type, value, onChange, onKeyDown, onBlur }) {
  return (
    <div 
      className="flex items-center gap-1.5 px-3 py-[3px] border border-violet-500/50 bg-[#161622] rounded mx-1 my-0.5"
      style={{ paddingLeft: 12 + depth * 8 }}
    >
      <span className="shrink-0">
        {type === 'dir' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        )}
      </span>
      <input
        autoFocus
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className="flex-1 bg-transparent text-[11px] text-white border-none outline-none p-0 m-0"
        placeholder={type === 'dir' ? 'New folder...' : 'New file...'}
      />
    </div>
  )
}

function ConfirmDeleteModal({ node, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-96 bg-[#13141f] border-2 border-black rounded-3xl p-6 shadow-[2px_2px_0px_#000] text-center animate-scale-up font-sans select-none">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 text-red-500 mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-400 mb-2">Delete Permanently?</h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Are you absolutely sure you want to permanently delete <strong className="text-white font-mono break-all">{node.name}</strong>? This action is irreversible.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-5 py-2 bg-red-500 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] hover:scale-105 transition cursor-pointer"
          >
            <Trash2 size={14} className="shrink-0" /> Yes, Delete
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-emerald-400 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] hover:scale-105 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function TreeRow({ 
  node, 
  depth, 
  gitFiles, 
  onFileClick, 
  onContextMenu, 
  selectedNode, 
  setSelectedNode,
  inlineInput,
  setInlineInput,
  inputValue,
  setInputValue,
  handleKeyDown,
  renamingNode,
  setRenamingNode,
  openPaths,
  toggleOpen
}) {
  const theme = useStore((s) => s.theme)
  const fileIconTheme = useStore((s) => s.fileIconTheme)
  const open = openPaths.has(node.path)
  const isDir = node.type === 'dir'
  const isSelected = selectedNode && selectedNode.path === node.path
  
  const nodePath = node.path.replace(/\\/g, '/')
  const gitFile = gitFiles.find(f => {
    const relPath = f.path.replace(/\\/g, '/')
    return nodePath.endsWith(relPath)
  })
  
  const gitColor = gitFile ? (gitFile.y === 'M' || gitFile.x === 'M' || gitFile.x === 'A' ? '#e2c522' : gitFile.x === '?' ? '#81b88b' : null) : null

  const isRenaming = renamingNode && renamingNode.path === node.path
  const showInlineInputHere = inlineInput && inlineInput.parentPath === node.path

  if (isRenaming) {
    return (
      <InlineInputRow 
        depth={depth} 
        type={node.type} 
        value={inputValue} 
        onChange={(e) => setInputValue(e.target.value)} 
        onKeyDown={(e) => handleKeyDown(e, true)} 
        onBlur={() => { setRenamingNode(null); setInputValue(''); }}
      />
    )
  }

  return (
    <>
      <div
        className={`group flex cursor-pointer items-center justify-between gap-1.5 px-3 py-[2px] text-[11px] transition-colors select-none ${
          isSelected 
            ? 'bg-[#094771] text-white font-semibold' 
            : 'hover:bg-[#2a2d2e] text-[#cccccc]'
        } ${!isDir && gitColor && !isSelected ? 'text-opacity-100' : ''}`}
        style={{ paddingLeft: 12 + depth * 8 }}
        onClick={() => {
          setSelectedNode(node)
          if (isDir) {
            toggleOpen(node.path)
          } else {
            onFileClick(node)
          }
        }}
        onDoubleClick={(e) => {
          if (isDir) {
            e.stopPropagation()
            toggleOpen(node.path, true)
            setInlineInput({ type: 'file', parentPath: node.path })
            setInputValue('')
          }
        }}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isDir ? (
            theme?.includes('cutie') ? (
              <span className="shrink-0 text-[13px] inline-flex items-center justify-center w-4 h-4 text-pink-400">
                {open ? <FolderOpen size={14} /> : <Folder size={14} />}
              </span>
            ) : theme === 'cyberpunk' ? (
              <span className="shrink-0 text-[#ff007f] font-black font-mono text-[10px] w-4 h-4 inline-flex items-center justify-center" style={{ textShadow: `0 0 5px #ff007f` }}>{open ? '[-]' : '[+]'}</span>
            ) : (
              <span className="shrink-0 transition-transform duration-100" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            )
          ) : (
            getFileIcon(node.name, theme, fileIconTheme)
          )}
          <span className="truncate flex-1">{node.name}</span>
        </div>
        
        {isDir && (
          <div className="hidden group-hover:flex items-center gap-1.5 pr-1.5 shrink-0 animate-in fade-in duration-100">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                toggleOpen(node.path, true);
                setInlineInput({ type: 'file', parentPath: node.path }); 
                setInputValue(''); 
              }} 
              title="New File" 
              className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                toggleOpen(node.path, true);
                setInlineInput({ type: 'dir', parentPath: node.path }); 
                setInputValue(''); 
              }} 
              title="New Folder" 
              className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </button>
          </div>
        )}

        {!isDir && gitColor && (
          <span className="text-[10px] font-bold opacity-80" style={{ color: gitColor }}>
            {gitFile.x === '?' ? 'U' : gitFile.x || gitFile.y}
          </span>
        )}
      </div>
      {isDir && open && (
        <div>
          {showInlineInputHere && (
            <InlineInputRow 
              depth={depth + 1} 
              type={inlineInput.type} 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              onKeyDown={(e) => handleKeyDown(e, false)} 
              onBlur={() => { setInputValue(''); }}
            />
          )}
          {node.children && node.children.map(child => (
            <TreeRow 
              key={child.path} 
              node={child} 
              depth={depth + 1} 
              gitFiles={gitFiles} 
              onFileClick={onFileClick} 
              onContextMenu={onContextMenu} 
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              inlineInput={inlineInput}
              setInlineInput={setInlineInput}
              inputValue={inputValue}
              setInputValue={setInputValue}
              handleKeyDown={handleKeyDown}
              renamingNode={renamingNode}
              setRenamingNode={setRenamingNode}
              openPaths={openPaths}
              toggleOpen={toggleOpen}
            />
          ))}
        </div>
      )}
    </>
  )
}

function FileContextMenu({ 
  x, 
  y, 
  node, 
  onClose, 
  refreshTree, 
  handleFileClick, 
  selectedNode, 
  setSelectedNode,
  setInlineInput,
  setRenamingNode,
  setInputValue,
  setConfirmDeleteNode,
  toggleOpen
}) {
  const rootPath = useStore((s) => s.rootPath)
  const addTerminal = useStore((s) => s.addTerminal)
  const setTerminalPanelOpen = useStore((s) => s.setTerminalPanelOpen)
  const comparePath = useStore((s) => s.comparePath)
  const setComparePath = useStore((s) => s.setComparePath)
  const openTab = useStore((s) => s.openTab)
  
  const isHTML = node.name.toLowerCase().endsWith('.html') || node.name.toLowerCase().endsWith('.htm')

  // Adjust positioning to stay within window boundaries
  const adjustedX = Math.min(x, window.innerWidth - 240)
  const adjustedY = Math.min(y, window.innerHeight - 420)

  const handleOpenLiveServer = async () => {
    if (!window.electron) return
    const { id } = await window.electron.terminal.create({ cwd: rootPath || undefined })
    addTerminal({ id, name: `Server: ${node.name}` })
    setTerminalPanelOpen(true)
    useStore.setState({ activeTerminalId: id })
    setTimeout(() => {
      const isMac = window.electron.isMac
      const openCmd = isMac ? 'open' : 'start ""'
      window.electron.terminal.write(id, `npx -y live-server "${node.path}" || ${openCmd} "${node.path}"\r`)
    }, 500)
    onClose()
  }

  const handleReveal = async () => {
    if (window.electron?.fs?.reveal) {
      await window.electron.fs.reveal(node.path)
    }
    onClose()
  }

  const handleOpenWithOther = () => {
    if (window.electron?.fs?.openExternal) {
      window.electron.fs.openExternal(`file://${node.path.replace(/\\/g, '/')}`)
    }
    onClose()
  }

  const handleSelectForCompare = () => {
    setComparePath(node.path)
    onClose()
  }

  const handleCompareWithSelected = async () => {
    if (!window.electron || !comparePath) return
    try {
      const original = await window.electron.fs.readFile(comparePath)
      const current = await window.electron.fs.readFile(node.path)
      
      const lang = detectLanguage(node.name)
      openTab({ path: node.path, name: `Compare: ${node.name}`, language: lang, content: current })
      
      setTimeout(() => {
        useStore.setState({
          originalCode: original,
          fixedCode: current,
          modernizeState: 'done',
          sourceUrl: `Comparing: ${comparePath.split(/[/\\]/).pop()} ↔ ${node.name}`
        })
      }, 50)
    } catch (err) {
      const store = useStore.getState();
      store.appendOutputLog('error', `Compare failed: ${err.message}`);
      store.setActiveSidebarTab('output');
    }
    onClose()
  }

  const handleOpenInTerminal = async () => {
    if (!window.electron) return
    const dir = node.type === 'dir' ? node.path : node.path.substring(0, node.path.lastIndexOf(/[/\\]/))
    const { id } = await window.electron.terminal.create({ cwd: dir || undefined })
    addTerminal({ id, name: `Terminal: ${node.name}` })
    setTerminalPanelOpen(true)
    useStore.setState({ activeTerminalId: id })
    onClose()
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path)
    onClose()
  }

  const handleCopyRelative = () => {
    const rel = rootPath ? node.path.replace(rootPath, '').replace(/^[/\\]/, '') : node.path
    navigator.clipboard.writeText(rel)
    onClose()
  }

  const triggerCreateFile = () => {
    const parentPath = node.type === 'dir' ? node.path : (node.path.substring(0, Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\'))) || rootPath)
    if (parentPath && toggleOpen) toggleOpen(parentPath, true)
    setInlineInput({ type: 'file', parentPath })
    setInputValue('')
    onClose()
  }

  const triggerCreateFolder = () => {
    const parentPath = node.type === 'dir' ? node.path : (node.path.substring(0, Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\'))) || rootPath)
    if (parentPath && toggleOpen) toggleOpen(parentPath, true)
    setInlineInput({ type: 'dir', parentPath })
    setInputValue('')
    onClose()
  }

  const triggerRename = () => {
    setRenamingNode(node)
    setInputValue(node.name)
    onClose()
  }

  const triggerDelete = () => {
    setConfirmDeleteNode(node)
    onClose()
  }

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[998]" 
        onClick={onClose} 
        onContextMenu={(e) => { e.preventDefault(); onClose(); }} 
      />
      <div
        className="fixed z-[999] w-56 bg-[#161622]/95 backdrop-blur-md border border-[#2b2b3a] rounded-lg shadow-2xl p-1 text-[11px] text-[#cccccc] font-medium select-none animate-in fade-in zoom-in-95 duration-100 max-h-[80vh] overflow-y-auto scrollbar-hide"
        style={{ top: adjustedY, left: adjustedX }}
      >
        <button onClick={triggerCreateFile} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between font-semibold text-violet-400">
          <span>New File...</span>
          <span className="text-[9px] opacity-40">Alt+N</span>
        </button>
        <button onClick={triggerCreateFolder} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between font-semibold text-violet-400">
          <span>New Folder...</span>
          <span className="text-[9px] opacity-40">Alt+Shift+N</span>
        </button>
        
        <div className="my-1 border-t border-[#2b2b3a]/50" />

        {isHTML && (
          <>
            <button onClick={handleOpenLiveServer} className="w-full text-left px-2.5 py-1.5 hover:bg-[#3b3b54] hover:text-white rounded transition-colors flex items-center justify-between">
              <span className="text-violet-400 font-bold">Open with Live Server</span>
              <span className="text-[9px] opacity-40">Alt+L</span>
            </button>
            <div className="my-1 border-t border-[#2b2b3a]/50" />
          </>
        )}

        <button onClick={() => { if (node.type !== 'dir') handleFileClick(node); onClose(); }} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between">
          <span>Open to the Side</span>
          <span className="text-[9px] opacity-40">Ctrl+Enter</span>
        </button>

        <button onClick={handleOpenWithOther} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors">
          Open With...
        </button>

        <button onClick={handleReveal} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between">
          <span>Reveal in File Explorer</span>
          <span className="text-[9px] opacity-40">Shift+Alt+R</span>
        </button>

        <button onClick={handleOpenInTerminal} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors">
          Open in Integrated Terminal
        </button>

        <div className="my-1 border-t border-[#2b2b3a]/50" />

        <button className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between opacity-50 cursor-not-allowed">
          <span>Maven</span>
          <span className="text-[9px]">▶</span>
        </button>

        <button className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between opacity-50 cursor-not-allowed">
          <span>Share</span>
          <span className="text-[9px]">▶</span>
        </button>

        <div className="my-1 border-t border-[#2b2b3a]/50" />

        <button onClick={handleSelectForCompare} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors">
          Select for Compare
        </button>

        {comparePath && comparePath !== node.path && node.type !== 'dir' && (
          <button onClick={handleCompareWithSelected} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors">
            Compare with Selected
          </button>
        )}

        <button onClick={() => { useStore.setState({ activeSidebarTab: 'git' }); onClose(); }} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors">
          Open Timeline
        </button>

        <div className="my-1 border-t border-[#2b2b3a]/50" />

        <button onClick={handleCopyPath} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between">
          <span>Cut</span>
          <span className="text-[9px] opacity-40">Ctrl+X</span>
        </button>

        <button onClick={handleCopyPath} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between">
          <span>Copy</span>
          <span className="text-[9px] opacity-40">Ctrl+C</span>
        </button>

        <div className="my-1 border-t border-[#2b2b3a]/50" />

        <button onClick={handleCopyPath} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between">
          <span>Copy Path</span>
          <span className="text-[9px] opacity-40">Shift+Alt+C</span>
        </button>

        <button onClick={handleCopyRelative} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between">
          <span>Copy Relative Path</span>
          <span className="text-[9px] opacity-40">Ctrl+K Ctrl+Shift+C</span>
        </button>

        <div className="my-1 border-t border-[#2b2b3a]/50" />

        <button onClick={triggerRename} className="w-full text-left px-2.5 py-1.2 hover:bg-[#2c2c3d] hover:text-white rounded transition-colors flex items-center justify-between">
          <span>Rename...</span>
          <span className="text-[9px] opacity-40">F2</span>
        </button>

        <button onClick={triggerDelete} className="w-full text-left px-2.5 py-1.2 hover:bg-red-950/20 hover:text-red-400 rounded transition-colors flex items-center justify-between text-red-500/90 font-bold">
          <span>Delete</span>
          <span className="text-[9px] opacity-55">Delete</span>
        </button>
      </div>
    </>,
    document.body
  )
}

export default function FileTree() {
  const rootPath = useStore((s) => s.rootPath)
  const fileTree = useStore((s) => s.fileTree)
  const setRootPath = useStore((s) => s.setRootPath)
  const setFileTree = useStore((s) => s.setFileTree)
  const openTab = useStore((s) => s.openTab)
  const gitStatus = useStore((s) => s.gitStatus)
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)

  const [explorerOpen, setExplorerOpen] = useState(true)
  const [contextMenu, setContextMenu] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingFile, setLoadingFile] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)

  // Track which folder paths are expanded — lifted from TreeRow so refreshTree() doesn't collapse them
  const [openPaths, setOpenPaths] = useState(new Set())
  const toggleOpen = useCallback((path, forceOpen) => {
    setOpenPaths(prev => {
      const next = new Set(prev)
      if (forceOpen) { next.add(path) } else if (next.has(path)) { next.delete(path) } else { next.add(path) }
      return next
    })
  }, [])

  // Inline inputs state
  const [inlineInput, setInlineInput] = useState(null) // { type: 'file' | 'dir', parentPath: string }
  const [renamingNode, setRenamingNode] = useState(null) // node
  const [inputValue, setInputValue] = useState('')
  const [confirmDeleteNode, setConfirmDeleteNode] = useState(null)

  const refreshTree = useCallback(async () => {
    if (!rootPath || !window.electron) return
    setIsLoading(true)
    try {
      let tree = await window.electron.fs.getTree(rootPath)
      // Normalize: if Rust returns a single root object, extract its children
      if (tree && !Array.isArray(tree) && tree.children) {
        tree = tree.children
      }
      if (!Array.isArray(tree)) tree = []
      setFileTree(tree)
    } finally {
      setIsLoading(false)
    }
  }, [rootPath, setFileTree])

  // Auto-highlight active open tab in the explorer tree
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab) {
      setSelectedNode({ path: activeTab.path, type: 'file', name: activeTab.name })
    }
  }, [activeTabId, tabs])

  // Listen for real-time filesystem changes
  useEffect(() => {
    if (!window.electron?.fs?.onChanged || !rootPath) return
    
    // Tell the backend to start watching this directory
    if (window.electron.fs.watchProject) {
      window.electron.fs.watchProject(rootPath)
    }

    let throttleTimeout = null
    const unsubscribe = window.electron.fs.onChanged(() => {
      if (throttleTimeout) clearTimeout(throttleTimeout)
      throttleTimeout = setTimeout(() => {
        refreshTree()
      }, 500)
    })
    
    return () => {
      if (throttleTimeout) clearTimeout(throttleTimeout)
      unsubscribe()
    }
  }, [rootPath, refreshTree])

  const handleOpen = useCallback(async () => {
    // Use the shared action that also kills old terminals and spawns a new one at the new folder
    setIsLoading(true)
    try {
      await openFolderAndResetTerminals()
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleFileClick = useCallback(
    async (node) => {
      const e = window.electron
      if (!e) return
      setLoadingFile(node.path)
      try {
        const content = await e.fs.readFile(node.path)
        const lang = detectLanguage(node.name)
        openTab({ path: node.path, name: node.name, language: lang, content })
      } catch (err) {
        console.error('[FileTree] read error:', err)
      } finally {
        setLoadingFile(null)
      }
    },
    [openTab]
  )

  const handleCreateFile = useCallback((forceRoot = false) => {
    let parentPath = rootPath
    if (!forceRoot && selectedNode) {
      parentPath = selectedNode.type === 'dir'
        ? selectedNode.path
        : (selectedNode.path.substring(0, Math.max(selectedNode.path.lastIndexOf('/'), selectedNode.path.lastIndexOf('\\'))) || rootPath)
      if (parentPath !== rootPath) toggleOpen(parentPath, true)
    }
    setInlineInput({ type: 'file', parentPath })
    setInputValue('')
  }, [rootPath, selectedNode, toggleOpen])

  const handleCreateFolder = useCallback((forceRoot = false) => {
    let parentPath = rootPath
    if (!forceRoot && selectedNode) {
      parentPath = selectedNode.type === 'dir'
        ? selectedNode.path
        : (selectedNode.path.substring(0, Math.max(selectedNode.path.lastIndexOf('/'), selectedNode.path.lastIndexOf('\\'))) || rootPath)
      if (parentPath !== rootPath) toggleOpen(parentPath, true)
    }
    setInlineInput({ type: 'dir', parentPath })
    setInputValue('')
  }, [rootPath, selectedNode, toggleOpen])

  const handleInlineSubmit = async () => {
    if (!inputValue.trim() || !window.electron || !inlineInput) {
      setInlineInput(null)
      return
    }
    const name = inputValue.trim()
    const dir = inlineInput.parentPath
    const sep = dir.includes('\\') ? '\\' : '/'
    const targetPath = `${dir}${sep}${name}`
    
    try {
      if (inlineInput.type === 'file') {
        const ext = name.split('.').pop().toLowerCase()
        let initialContent = ''
        if (ext === 'html' || ext === 'htm') {
          initialContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>`
        } else if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
          initialContent = `// ${name}\n`
        } else if (['css', 'scss', 'less'].includes(ext)) {
          initialContent = `/* ${name} */\n`
        } else if (['py', 'rb', 'sh', 'yaml', 'yml'].includes(ext)) {
          initialContent = `# ${name}\n`
        } else if (['go', 'rs', 'c', 'cpp', 'java', 'cs'].includes(ext)) {
          initialContent = `// ${name}\n`
        }

        await window.electron.fs.writeFile(targetPath, initialContent)
        const lang = detectLanguage(name)
        openTab({ path: targetPath, name, language: lang, content: initialContent })
      } else {
        await window.electron.fs.createFolder(targetPath)
      }
      setSelectedNode({ path: targetPath, name, type: inlineInput.type })
      await refreshTree()
    } catch (err) {
      const store = useStore.getState();
      store.appendOutputLog('error', `Error creating ${inlineInput.type}: ${err.message}`);
      store.setActiveSidebarTab('output');
    } finally {
      setInlineInput(null)
      setInputValue('')
    }
  }

  const handleRenameSubmit = async () => {
    if (!inputValue.trim() || !window.electron || !renamingNode) {
      setRenamingNode(null)
      return
    }
    const newName = inputValue.trim()
    if (newName === renamingNode.name) {
      setRenamingNode(null)
      return
    }
    const parent = renamingNode.path.substring(0, Math.max(renamingNode.path.lastIndexOf('/'), renamingNode.path.lastIndexOf('\\')))
    const sep = renamingNode.path.includes('\\') ? '\\' : '/'
    const newPath = `${parent}${sep}${newName}`

    try {
      const success = await window.electron.fs.rename(renamingNode.path, newPath)
      if (success) {
        // Rename open tabs
        const storeState = useStore.getState()
        const targetTab = storeState.tabs.find(t => t.path === renamingNode.path)
        if (targetTab) {
          const lang = detectLanguage(newName)
          storeState.openTab({ path: newPath, name: newName, language: lang, content: targetTab.content })
          storeState.closeTab(targetTab.id)
        }
        await refreshTree()
      } else {
        const store = useStore.getState();
        store.appendOutputLog('error', "Failed to rename file/folder.");
        store.setActiveSidebarTab('output');
      }
    } catch (err) {
      const store = useStore.getState();
      store.appendOutputLog('error', `Error renaming: ${err.message}`);
      store.setActiveSidebarTab('output');
    } finally {
      setRenamingNode(null)
      setInputValue('')
    }
  }

  const handleKeyDown = (e, isRename = false) => {
    if (e.key === 'Enter') {
      if (isRename) {
        handleRenameSubmit()
      } else {
        handleInlineSubmit()
      }
    } else if (e.key === 'Escape') {
      setInlineInput(null)
      setRenamingNode(null)
      setInputValue('')
    }
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteNode || !window.electron?.fs?.delete) return
    try {
      const success = await window.electron.fs.delete(confirmDeleteNode.path)
      if (success) {
        // Clear active selection if it was deleted
        if (selectedNode && selectedNode.path === confirmDeleteNode.path) {
          setSelectedNode(null)
        }
        
        // Auto-close any open tabs for the deleted file/folder
        const storeState = useStore.getState()
        const tabsToClose = storeState.tabs.filter(t => t.path === confirmDeleteNode.path || t.path.startsWith(confirmDeleteNode.path + '/') || t.path.startsWith(confirmDeleteNode.path + '\\'))
        tabsToClose.forEach(tab => {
          storeState.closeTab(tab.id)
        })

        await refreshTree()
      } else {
        const store = useStore.getState();
        store.appendOutputLog('error', "Failed to delete file/folder.");
        store.setActiveSidebarTab('output');
      }
    } catch (err) {
      const store = useStore.getState();
      store.appendOutputLog('error', `Error deleting: ${err.message}`);
      store.setActiveSidebarTab('output');
    } finally {
      setConfirmDeleteNode(null)
    }
  }

  const handleContextMenu = useCallback((e, node) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node
    })
  }, [])

  const showRootInlineInput = inlineInput && inlineInput.parentPath === rootPath

  return (
    <div className="flex h-full flex-col select-none relative">
      {/* Root Folder Section */}
      <div 
        className="group flex h-7 items-center gap-1.5 px-1 bg-[#1e1e1e] hover:bg-white/5 cursor-pointer select-none border-b border-white/[0.03]"
      >
        <div className="flex flex-1 items-center gap-1.5 overflow-hidden" onClick={() => setExplorerOpen(!explorerOpen)}>
          <span className="transition-transform duration-100" style={{ transform: explorerOpen ? 'none' : 'rotate(-90deg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">
            {rootPath ? rootPath.split(/[/\\]/).pop() : 'No Project'}
          </span>
        </div>
        
        {rootPath && (
          <div className="hidden group-hover:flex items-center gap-1 pr-1 animate-in fade-in duration-200">
             <button onClick={(e) => { e.stopPropagation(); handleCreateFile(true); }} title="New File at Root" className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
             </button>
             <button onClick={(e) => { e.stopPropagation(); handleCreateFolder(true); }} title="New Folder at Root" className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
             </button>
             <button onClick={(e) => { e.stopPropagation(); refreshTree(); }} title="Refresh" className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
             </button>
          </div>
        )}
      </div>

      {explorerOpen && (
        <div 
          className="flex-1 overflow-y-auto pt-0.5 relative" 
          onClick={() => setSelectedNode(null)}
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              // Deselect and open context menu for root, but since FileContextMenu requires a node, 
              // we just deselect for now. You could pass root node if you wanted root context menu.
              setSelectedNode(null);
            }
          }}
        >
          {isLoading ? (
            <div className="absolute inset-0 z-10 flex flex-col gap-1 p-2 bg-slate-950/20 backdrop-blur-[1px]">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 opacity-50" style={{ paddingLeft: 12 + (i % 3 === 0 ? 8 : 0) }}>
                  <div className="w-3.5 h-3.5 rounded-sm bg-slate-700/50 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                  <div className="h-2 rounded bg-slate-700/50 animate-pulse w-3/4 max-w-[140px]" style={{ animationDelay: `${i * 100}ms` }} />
                </div>
              ))}
            </div>
          ) : !fileTree ? (
            <div className="flex flex-col gap-4 p-6">
               <p className="text-[13px] text-aeres-muted leading-relaxed font-semibold">You have not yet opened a folder.</p>
              <button
                type="button"
                onClick={handleOpen}
                className="w-full bg-[#007acc] hover:bg-[#0062a3] text-white py-1.5 text-[13px] rounded transition-colors font-bold"
              >
                Open Folder
              </button>
            </div>
          ) : (
            <>
              {showRootInlineInput && (
                <InlineInputRow 
                  depth={0} 
                  type={inlineInput.type} 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  onKeyDown={(e) => handleKeyDown(e, false)} 
                  onBlur={() => { setInputValue(''); }}
                />
              )}
              {[...(Array.isArray(fileTree) ? fileTree : (fileTree?.children || []))].sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name)
                return a.type === 'dir' ? -1 : 1
              }).map((node) => (
                <TreeRow
                  key={node.path}
                  node={node}
                  depth={0}
                  gitFiles={gitStatus.files || []}
                  onFileClick={handleFileClick}
                  onContextMenu={handleContextMenu}
                  loadingFile={loadingFile}
                  selectedNode={selectedNode}
                  setSelectedNode={setSelectedNode}
                  inlineInput={inlineInput}
                  setInlineInput={setInlineInput}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  handleKeyDown={handleKeyDown}
                  renamingNode={renamingNode}
                  setRenamingNode={setRenamingNode}
                  openPaths={openPaths}
                  toggleOpen={toggleOpen}
                />
              ))}
            </>
          )}
        </div>
      )}

      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          refreshTree={refreshTree}
          handleFileClick={handleFileClick}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          setInlineInput={setInlineInput}
          setRenamingNode={setRenamingNode}
          setInputValue={setInputValue}
          setConfirmDeleteNode={setConfirmDeleteNode}
          toggleOpen={toggleOpen}
        />
      )}

      {confirmDeleteNode && (
        <ConfirmDeleteModal 
          node={confirmDeleteNode} 
          onConfirm={handleConfirmDelete} 
          onCancel={() => setConfirmDeleteNode(null)} 
        />
      )}
    </div>
  )
}
