import { useCallback, useState } from 'react'
import { useStore } from '../../store.js'

const EXT_LANG = {
  '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python', '.css': 'css', '.json': 'json', '.md': 'markdown',
  '.html': 'html', '.htm': 'html', '.yml': 'yaml', '.yaml': 'yaml',
  '.sh': 'shell', '.bash': 'shell', '.toml': 'toml', '.xml': 'xml',
}

const EXT_COLORS = {
  javascript: '#f7df1e', typescript: '#3178c6', python: '#3776ab',
  css: '#264de4', json: '#a8a8a8', markdown: '#519aba',
  html: '#e34f26', yaml: '#cb171e', shell: '#89e051',
}

function detectLanguage(name) {
  const ext = name.includes('.') ? '.' + name.split('.').pop().toLowerCase() : ''
  return EXT_LANG[ext] || 'plaintext'
}

function TreeRow({ node, depth, gitFiles, onFileClick }) {
  const [open, setOpen] = useState(depth < 2)
  const isDir = node.type === 'dir'
  const lang = isDir ? null : detectLanguage(node.name)
  
  // Normalize paths for comparison
  const nodePath = node.path.replace(/\\/g, '/')
  const gitFile = gitFiles.find(f => {
    // git status paths are relative to root, node.path is absolute
    // We check if the absolute path ends with the git relative path
    const relPath = f.path.replace(/\\/g, '/')
    return nodePath.endsWith(relPath)
  })
  
  const gitColor = gitFile ? (gitFile.y === 'M' || gitFile.x === 'M' || gitFile.x === 'A' ? '#f59e0b' : gitFile.x === '?' ? '#ef4444' : null) : null

  return (
    <>
      <div
        className="group flex cursor-pointer items-center gap-1 px-2 py-[3px] text-xs transition-all duration-150 hover:bg-white/[0.04] rounded-sm mx-1"
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => (isDir ? setOpen(!open) : onFileClick(node))}
      >
        {isDir ? (
          <span className="w-4 shrink-0 text-center text-aether-muted">{open ? '▾' : '▸'}</span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {!isDir && lang && (
          <span
            className="mr-1 inline-block rounded-sm px-1 py-px text-[8px] font-bold uppercase tracking-wide"
            style={{ color: EXT_COLORS[lang] || '#71717a', background: 'rgba(255,255,255,0.04)' }}
          >
            {node.ext || lang.slice(0, 2)}
          </span>
        )}
        <span className="min-w-0 truncate text-white/50 group-hover:text-white/80 transition-colors">{node.name}</span>
        {gitColor && (
          <span className="ml-auto h-2 w-2 shrink-0 rounded-full" style={{ background: gitColor }} />
        )}
      </div>
      {isDir && open && node.children?.map((child) => (
        <TreeRow key={child.path} node={child} depth={depth + 1} gitFiles={gitFiles} onFileClick={onFileClick} />
      ))}
    </>
  )
}

export default function FileTree() {
  const rootPath = useStore((s) => s.rootPath)
  const fileTree = useStore((s) => s.fileTree)
  const setRootPath = useStore((s) => s.setRootPath)
  const setFileTree = useStore((s) => s.setFileTree)
  const openTab = useStore((s) => s.openTab)
  const gitStatus = useStore((s) => s.gitStatus)

  const handleOpen = useCallback(async () => {
    const e = window.electron
    if (!e) return
    const result = await e.fs.openFolder()
    if (!result) return
    const folderPath = Array.isArray(result) ? result[0] : result
    if (!folderPath) return
    setRootPath(folderPath)
    const tree = await e.fs.getTree(folderPath)
    setFileTree(tree)
  }, [setRootPath, setFileTree])

  const handleFileClick = useCallback(
    async (node) => {
      const e = window.electron
      if (!e) return
      try {
        const content = await e.fs.readFile(node.path)
        const lang = detectLanguage(node.name)
        openTab({ path: node.path, name: node.name, language: lang, content })
      } catch (err) {
        console.error('[FileTree] read error:', err)
      }
    },
    [openTab]
  )

  const handleRunProject = useCallback(async () => {
    if (!rootPath || !window.electron) return
    const { detectProjectCommand } = await import('../../utils/projectRunner.js')
    const cmd = await detectProjectCommand(rootPath)
    if (!cmd) {
      alert('Could not detect a project type to run. Please ensure your project has a package.json, main.py, or similar entry point.')
      return
    }

    if (cmd === 'open-browser') {
      await window.electron.debug.launch({ filePath: `${rootPath}/index.html` })
      return
    }

    const { id } = await window.electron.terminal.create({ cwd: rootPath })
    useStore.getState().addTerminal({ id, name: `Run: ${cmd}` })
    useStore.getState().setTerminalPanelOpen(true)
    setTimeout(() => {
      window.electron.terminal.write(id, `${cmd}\r`)
    }, 500)
  }, [rootPath])

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 items-center justify-between border-b border-white/[0.04] px-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20 font-mono">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRunProject}
            title="Run Project"
            className="flex h-5 w-5 items-center justify-center rounded text-green-500 transition hover:bg-green-500/10 hover:text-green-400"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button
            type="button"
            onClick={handleOpen}
            className="rounded px-2 py-0.5 text-[10px] font-bold text-aether-muted transition hover:bg-aether-violet/20 hover:text-aether-violet"
          >
            Open
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {!fileTree ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-xs text-aether-muted">No folder open</p>
            <button
              type="button"
              onClick={handleOpen}
              className="rounded-md border border-aether-border px-4 py-1.5 text-xs text-aether-text transition hover:border-aether-violet"
            >
              Open Folder
            </button>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <p className="text-xs text-aether-muted italic">Folder is empty</p>
          </div>
        ) : (
          fileTree.map((node) => (
            <TreeRow
              key={node.path}
              node={node}
              depth={0}
              gitFiles={gitStatus.files || []}
              onFileClick={handleFileClick}
            />
          ))
        )}
      </div>
    </div>
  )
}
