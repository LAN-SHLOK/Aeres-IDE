import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { Camera, Clipboard } from 'lucide-react'
import EditorTabs from './EditorTabs.jsx'
import { useStore } from '../../store.js'
import { emmetHTML, emmetCSS, emmetJSX } from 'emmet-monaco-es'

import WelcomeScreen from './WelcomeScreen.jsx'

import useTemporalLens from './TemporalLens.jsx'

export default function CodeCanvas() {
  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const setTabDirty = useStore((s) => s.setTabDirty)
  const setTabContent = useStore((s) => s.setTabContent)
  const closeTab = useStore((s) => s.closeTab)
  const addTerminal = useStore((s) => s.addTerminal)
  const setTerminalPanelOpen = useStore((s) => s.setTerminalPanelOpen)
  const editorSettings = useStore(s => s.editorSettings)
  const isAeresMode = useStore(s => s.isAeresMode)
  const openTab = useStore(s => s.openTab)

  //  Keyboard Shortcuts & IPC
  const installedExtensions = useStore((s) => s.installedExtensions || [])
  const disabledExtensions = useStore((s) => s.disabledExtensions || [])

  // Modernize state
  const modernizeState = useStore((s) => s.modernizeState)
  const originalCode = useStore((s) => s.originalCode)
  const fixedCode = useStore((s) => s.fixedCode)
  const sourceUrl = useStore((s) => s.sourceUrl)
  const setModernizeState = useStore((s) => s.setModernizeState)
  const appendFixedCode = useStore((s) => s.appendFixedCode)
  const resetModernize = useStore((s) => s.resetModernize)
  const activeTerminalId = useStore((s) => s.activeTerminalId)
  const typewriterMode = useStore((s) => s.typewriterMode)
  const zenMode = useStore((s) => s.zenMode)
  const theme = useStore((s) => s.theme)

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isHTML = activeTab?.name?.toLowerCase().endsWith('.html') || activeTab?.name?.toLowerCase().endsWith('.htm')
  const [localContent, setLocalContent] = useState('')
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const lastOnChangeValue = useRef('')
  const pendingUserEdits = useRef(new Set())
  const highlightDecorationsRef = useRef([])
  const [editorLoaded, setEditorLoaded] = useState(false)
  const showTemporal = useStore((s) => s.showTemporal)

  const [editorInstance, setEditorInstance] = useState(null)
  useTemporalLens(editorInstance, activeTab?.path, showTemporal && editorLoaded)

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })
  const [codeSnapData, setCodeSnapData] = useState({ visible: false, code: '', fileName: '' })
  const [activePeekSubmenu, setActivePeekSubmenu] = useState(false)

  // Sync editor value when activeTab.content changes externally (e.g. from AI)
  useEffect(() => {
    if (!editorLoaded || !activeTab) return
    const monaco = window.monaco
    if (!monaco) return
    const model = monaco.editor.getModel(monaco.Uri.parse(`file:///${activeTab.path.replace(/\\/g, '/')}`))
    if (model && activeTab.content !== undefined) {
      const currentVal = model.getValue()
      // Normalize to handle CR/LF mismatch
      const normCurrent = currentVal.replace(/\r\n/g, '\n')
      const normNew = activeTab.content.replace(/\r\n/g, '\n')
      
      // If the store is just catching up to a value the user typed, ignore it
      if (pendingUserEdits.current.has(normNew)) {
        pendingUserEdits.current.delete(normNew)
        return
      }

      if (normCurrent !== normNew) {
        // Use pushEditOperations to preserve undo stack and cursor position
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: activeTab.content }],
          () => null
        )
      }
    }
  }, [activeTab?.content, activeTab?.path, editorLoaded])

  useEffect(() => {
    const hideMenu = () => {
      setContextMenu({ visible: false, x: 0, y: 0 })
      setActivePeekSubmenu(false)
    }
    window.addEventListener('click', hideMenu)
    return () => window.removeEventListener('click', hideMenu)
  }, [])

  useEffect(() => {
    if (activeTab) setLocalContent(activeTab.content || '')
  }, [activeTab?.id, activeTab?.content])

  // Dynamic Monaco Theme Definitions (Maps 1-to-1 to Aeres Custom HSL themes)
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return

    const themeColors = {
      'cutie-dark': { background: '#130f26', foreground: '#fffdf9' },
      'cutie-light': { background: '#fdfbf7', foreground: '#32283c' },
      dark: { background: '#020617', foreground: '#f1f5f9' },
      cyberpunk: { background: '#050508', foreground: '#00ffff' },
      nord: { background: '#1b222d', foreground: '#d8dee9' },
      retro: { background: '#0c0f0d', foreground: '#33ff33' },
      solarized: { background: '#001b22', foreground: '#839496' },
      amethyst: { background: '#0f0b1b', foreground: '#faf5ff' },
      aeres: { background: '#120e24', foreground: '#fffdf9' }
    }

    Object.entries(themeColors).forEach(([themeId, config]) => {
      monaco.editor.defineTheme(themeId, {
        base: themeId === 'cutie-light' ? 'vs' : 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: themeId === 'cutie-dark' ? '8e85aa' : themeId === 'cutie-light' ? '8a7f93' : themeId === 'aeres' ? '8e85aa' : '6272a4', fontStyle: 'italic' },
          { token: 'keyword', foreground: themeId === 'cutie-dark' ? 'ffb3c1' : themeId === 'cutie-light' ? 'a855f7' : themeId === 'retro' ? '33ff33' : themeId === 'cyberpunk' ? 'ff007f' : themeId === 'aeres' ? 'ffb3c1' : 'a855f7', fontStyle: 'bold' },
          { token: 'string', foreground: themeId === 'cutie-dark' ? '6ee7b7' : themeId === 'cutie-light' ? '059669' : themeId === 'retro' ? '00ff00' : themeId === 'aeres' ? '6ee7b7' : '50fa7b' },
          { token: 'number', foreground: themeId === 'cutie-dark' ? 'fef08a' : themeId === 'cutie-light' ? 'd97706' : themeId === 'aeres' ? 'fef08a' : 'b5cea8' }
        ],
        colors: {
          'editor.background': config.background,
          'editor.foreground': config.foreground,
          'editorCursor.foreground': themeId === 'cutie-dark' ? '#ffb3c1' : themeId === 'cutie-light' ? '#ff8ba7' : themeId === 'aeres' ? '#ffb3c1' : config.foreground,
          'editor.lineHighlightBackground': config.background + '20',
          'editorLineNumber.foreground': themeId === 'cutie-dark' ? '#4a3f68' : themeId === 'cutie-light' ? '#a59cae' : themeId === 'aeres' ? '#4a3f68' : '#4b5563',
          'editorLineNumber.activeForeground': themeId === 'cutie-dark' ? '#d8b4fe' : themeId === 'cutie-light' ? '#c084fc' : themeId === 'aeres' ? '#d8b4fe' : '#7c3aed'
        }
      })
    })

    // Force Monaco to re-draw active theme
    monaco.editor.setTheme(theme || 'dark')
  }, [theme, editorLoaded])

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editorLoaded) {
      editor.updateOptions({
        fontFamily: editorSettings.fontFamily,
        fontSize: editorSettings.fontSize,
        lineHeight: editorSettings.lineHeight,
        tabSize: editorSettings.tabSize,
        wordWrap: editorSettings.wordWrap,
        minimap: { enabled: !zenMode && editorSettings.minimap },
        cursorSurroundingLines: typewriterMode ? 999 : 0,
        cursorSurroundingLinesStyle: 'all',
        scrollBeyondLastLine: true,
      })
    }
  }, [editorSettings, editorLoaded, typewriterMode, zenMode])

  const triggerMonacoAction = (actionId) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    editor.trigger('contextmenu', actionId)
  }

  const getSelectedTextOrAll = () => {
    const editor = editorRef.current
    if (!editor) return ''
    const selection = editor.getSelection()
    const model = editor.getModel()
    if (!model) return ''
    if (selection && !selection.isEmpty()) {
      return model.getValueInRange(selection)
    }
    return model.getValue()
  }

  const handleCut = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const selection = editor.getSelection()
    const model = editor.getModel()
    if (selection && !selection.isEmpty() && model) {
      const text = model.getValueInRange(selection)
      await navigator.clipboard.writeText(text)
      editor.executeEdits('clipboard', [{
        range: selection,
        text: '',
        forceMoveMarkers: true
      }])
    }
  }, [])

  const handleCopy = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const text = getSelectedTextOrAll()
    if (text) {
      await navigator.clipboard.writeText(text)
    }
  }, [activeTab])

  const handlePaste = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    try {
      const text = await navigator.clipboard.readText()
      const selection = editor.getSelection()
      if (selection) {
        editor.executeEdits('clipboard', [{
          range: selection,
          text: text,
          forceMoveMarkers: true
        }])
      }
    } catch (err) {
      console.warn('Native paste failed, falling back to Monaco:', err)
      editor.trigger('keyboard', 'paste')
    }
  }, [])

  const handleCodeSnap = () => {
    const code = getSelectedTextOrAll()
    setCodeSnapData({
      visible: true,
      code: code || '// Highlight some code to snap!',
      fileName: activeTab ? activeTab.name : 'index.js'
    })
  }

  const handleAddFileToChat = () => {
    if (!activeTab) return
    document.dispatchEvent(new CustomEvent('aeres:add-to-chat', {
      detail: { path: activeTab.path, name: activeTab.name }
    }))
  }

  const handleReview = () => {
    if (!activeTab) return
    const sel = getSelectedTextOrAll()
    const prompt = sel.length < 200 
      ? `Review this file for bugs, quality issues, or refactoring: @${activeTab.name}`
      : `Review this specific code snippet for bugs, quality issues, or refactoring:\n\`\`\`${activeTab.language || 'javascript'}\n${sel}\n\`\`\``
    document.dispatchEvent(new CustomEvent('aeres:send-agent-prompt', { detail: prompt }))
    document.dispatchEvent(new CustomEvent('aeres:focus-chat'))
  }

  const handleOpenInlineChat = () => {
    document.dispatchEvent(new CustomEvent('aeres:focus-chat'))
  }


  const handleRunJupyter = async () => {
    if (activeTab?.language !== 'python') {
      const store = useStore.getState();
      store.appendOutputLog('error', "Jupyter execution is only available for Python files.");
      store.setActiveSidebarTab('output');
      return
    }
    // Open terminal panel to show output
    setTerminalPanelOpen(true)
    const backendPort = useStore.getState().backendUrl?.split(':').pop() || 8008
    try {
      const sessionId = 'jupyter-' + Date.now()
      const appendOutput = useStore.getState().appendOutputLog
      appendOutput('info', 'Executing Jupyter cell...')
      document.dispatchEvent(new CustomEvent('aeres:select-terminal-tab', { detail: 'output' }))
      
      const res = await fetch(`${useStore.getState().backendUrl}/api/jupyter/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, code: activeTab.content || localContent })
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (dataStr === '[DONE]') break
            try {
              const parsed = JSON.parse(dataStr)
              if (parsed.text) appendOutput('info', parsed.text.trim())
              if (parsed.data && parsed.data['text/plain']) appendOutput('info', parsed.data['text/plain'].trim())
              if (parsed.evalue) appendOutput('error', `${parsed.ename}: ${parsed.evalue}`)
            } catch (e) {}
          }
        }
      }
      appendOutput('success', 'Jupyter execution complete.')
    } catch (e) {
      console.error("Jupyter execution failed:", e)
      useStore.getState().appendOutputLog('error', 'Jupyter execution failed: ' + e.message)
    }
  }

  const handleExplain = () => {
    if (!activeTab) return
    const sel = getSelectedTextOrAll()
    const prompt = sel.length < 200 
      ? `Explain this file: @${activeTab.name}`
      : `Explain this specific code snippet:\n\`\`\`${activeTab.language || 'javascript'}\n${sel}\n\`\`\``
    document.dispatchEvent(new CustomEvent('aeres:send-chat-prompt', { detail: prompt }))
  }


  // Ctrl+W to close tab
  const breakpoints = useStore((s) => s.breakpoints[activeTab?.path] || [])
  const decorationIds = useRef([])

  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeTab) return
    const decs = (breakpoints || []).map(bp => ({
      range: new monaco.Range(bp.line, 1, bp.line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'aeres-breakpoint-gutter',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }))
    decorationIds.current = editor.deltaDecorations(decorationIds.current, decs)
  }, [breakpoints, editorLoaded, activeTab])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !activeTab?.line || !editorLoaded) return
    
    // Smooth scroll to the line with a retry mechanism for layout/model sync
    let attempts = 0
    const tryScroll = () => {
      const model = editor.getModel()
      if (model && model.getLineCount() >= activeTab.line) {
        editor.revealLineInCenter(activeTab.line)
        editor.setPosition({ lineNumber: activeTab.line, column: 1 })
        useStore.setState({ cursorLine: activeTab.line, cursorColumn: 1 })
        editor.focus()
      } else if (attempts < 10) {
        attempts++
        setTimeout(tryScroll, 50)
      }
    }
    
    tryScroll()
    
  }, [activeTab?.id, activeTab?.line, editorLoaded])

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editorLoaded) {
      const pos = editor.getPosition()
      if (pos) {
        useStore.setState({ cursorLine: pos.lineNumber, cursorColumn: pos.column })
      } else {
        useStore.setState({ cursorLine: 1, cursorColumn: 1 })
      }
    }
  }, [activeTabId, editorLoaded])

  // Custom highlights
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeTab?.highlightLines || !editorLoaded) {
      if (editor && highlightDecorationsRef.current.length > 0) {
        highlightDecorationsRef.current = editor.deltaDecorations(highlightDecorationsRef.current, [])
      }
      return
    }

    const decs = activeTab.highlightLines.map(line => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 'aeres-deprecated-highlight',
        linesDecorationsClassName: 'aeres-deprecated-margin',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }))
    highlightDecorationsRef.current = editor.deltaDecorations(highlightDecorationsRef.current, decs)
  }, [activeTab?.id, activeTab?.highlightLines, editorLoaded])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault()
        if (activeTabId) {
          const tab = tabs.find(t => t.id === activeTabId)
          if (tab?.isDirty && !window.confirm(`Save changes to ${tab.name}?`)) return
          closeTab(activeTabId)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTabId, closeTab, tabs])

    const documentVersions = useRef({})

    const handleChange = useCallback(
      (value) => {
        setLocalContent(value || '')
        lastOnChangeValue.current = value || ''
        
        // Record this value so the sync effect knows it came from the user typing
        const normVal = (value || '').replace(/\r\n/g, '\n')
        pendingUserEdits.current.add(normVal)
        
        // Prevent memory leak if user types incredibly fast and effect is delayed
        if (pendingUserEdits.current.size > 50) {
          const arr = Array.from(pendingUserEdits.current)
          pendingUserEdits.current = new Set(arr.slice(arr.length - 20))
        }

        if (activeTabId) {
          setTabDirty(activeTabId, true)
          setTabContent(activeTabId, value || '')
          
          // --- Real-time LSP Synchronization ---
          const tab = useStore.getState().tabs.find(t => t.id === activeTabId)
          if (tab && window.electron?.lsp) {
            const uri = `file:///${tab.path.replace(/\\/g, '/')}`
            const activeLang = tab.language === 'javascriptreact' ? 'javascript' : tab.language === 'typescriptreact' ? 'typescript' : tab.language
            documentVersions.current[uri] = (documentVersions.current[uri] || 1) + 1
            
            window.electron.lsp.notify(activeLang, 'textDocument/didChange', {
              textDocument: { uri, version: documentVersions.current[uri] },
              contentChanges: [{ text: value || '' }]
            })
          }
        }
      },
      [activeTabId, setTabDirty, setTabContent]
    )

  const handleModernize = useCallback(async () => {
    if (!activeTab || !window.electron) return
    const store = useStore.getState()
    const setModernizeState = store.setModernizeState
    const appendFixedCode = store.appendFixedCode
    
    store.resetModernize()
    useStore.setState({ originalCode: activeTab.content })
    setModernizeState('scanning')
    
    try {
      window.electron.analyze.onStream((chunk) => {
        if (!chunk) return
        
        if (chunk.status === 'done') {
          setModernizeState('done')
          if (!chunk.content) {
            const store = useStore.getState();
            store.appendOutputLog('info', 'No deprecations found in this file.');
            store.setActiveSidebarTab('output');
          }
        } else if (chunk.status === 'error') {
          setModernizeState('error')
          const store = useStore.getState();
          store.appendOutputLog('error', chunk.message || 'Error occurred during modernization');
          store.setActiveSidebarTab('output');
        } else if (chunk.status === 'streaming') {
          if (useStore.getState().modernizeState !== 'streaming') {
            setModernizeState('streaming')
          }
          // The backend sends the full updated code when swapping AST nodes
          useStore.setState({ fixedCode: chunk.content })
        } else if (chunk.type === 'flag_found') {
          if (chunk.source_url) {
            useStore.setState({ sourceUrl: chunk.source_url })
          }
        }
      })
      
      await window.electron.analyze.modernize(activeTab.content, activeTab.path)
    } catch (err) {
      console.error('Modernize stream error:', err)
      const store = useStore.getState();
      store.appendOutputLog('error', 'Failed to modernize code.');
      store.setActiveSidebarTab('output');
      useStore.setState({ modernizeState: 'error' })
    }
  }, [activeTab])

  const handleAccept = useCallback(async () => {
    if (!activeTab || !window.electron) return
    const code = useStore.getState().fixedCode
    await window.electron.fs.writeFile(activeTab.path, code)
    setTabContent(activeTabId, code)
    setTabDirty(activeTabId, false)
    setLocalContent(code)
    resetModernize()
  }, [activeTab, activeTabId, setTabContent, setTabDirty, resetModernize])

  const handleOpenLiveServer = useCallback(async () => {
    if (!activeTab || !window.electron) return
    const name = activeTab.name.toLowerCase()
    if (!name.endsWith('.html') && !name.endsWith('.htm')) return
    const store = useStore.getState()
    const { id } = await window.electron.terminal.create({ cwd: store.rootPath || undefined })
    addTerminal({ id, name: `Server: ${activeTab.name}` })
    setTerminalPanelOpen(true)
    useStore.setState({ activeTerminalId: id })
    setTimeout(() => {
      const isMac = window.electron.isMac
      const openCmd = isMac ? 'open' : 'start ""'
      window.electron.terminal.write(id, `npx -y live-server "${activeTab.path}" || ${openCmd} "${activeTab.path}"\r`)
    }, 500)
  }, [activeTab, addTerminal, setTerminalPanelOpen])

  const handleRunFile = useCallback(async () => {
    if (!activeTab || !window.electron) return
    
    // Import runner utility dynamically to keep CodeCanvas light
    const { detectFileCommand, detectProjectCommand } = await import('../../utils/projectRunner.js')
    const store = useStore.getState()
    
    let cmd = await detectFileCommand(activeTab.path, localContent)
    
    // Special handling for JSX or if file detection failed but we are in a project
    if (!cmd || activeTab.language === 'javascript' && activeTab.path.endsWith('.jsx')) {
      const projectCmd = await detectProjectCommand(store.rootPath)
      if (projectCmd) {
        cmd = projectCmd
      } else if (activeTab.path.endsWith('.jsx') || activeTab.path.endsWith('.tsx')) {
        const store = useStore.getState();
        store.appendOutputLog('error', 'JSX files cannot be run directly. Please open a project with a package.json to run this component.');
        store.setActiveSidebarTab('output');
        return
      }
    }

    if (!cmd) return
    
    if (cmd === 'open-browser' || cmd === 'live-server') {
      const { id } = await window.electron.terminal.create({ cwd: store.rootPath || undefined })
      addTerminal({ id, name: `Server: ${activeTab.name}` })
      setTerminalPanelOpen(true)
      useStore.setState({ activeTerminalId: id })
      setTimeout(() => {
        const isMac = window.electron.isMac
        const openCmd = isMac ? 'open' : 'start ""'
        // Run live-server (auto-installs if needed) or fallback to basic open
        window.electron.terminal.write(id, `npx -y live-server "${activeTab.path}" || ${openCmd} "${activeTab.path}"\r`)
      }, 500)
      return
    }

    let finalCmd = cmd
    if (activeTab.path.endsWith('.py') && window.electron.temporal) {
      try {
        const normalizedPath = activeTab.path.replace(/\\/g, '/')
        const lastSlash = Math.max(normalizedPath.lastIndexOf('/'), normalizedPath.lastIndexOf('\\'))
        const fileDir = lastSlash !== -1 ? normalizedPath.substring(0, lastSlash) : '.'
        const wrapperPath = `${fileDir}/.aeres_profile_wrapper.py`
        const wrapperCode = await window.electron.temporal.wrapPython(normalizedPath)
        await window.electron.fs.writeFile(wrapperPath, wrapperCode)
        const pythonBin = cmd.startsWith('python3') ? 'python3' : 'python'
        finalCmd = `${pythonBin} "${wrapperPath}"`
      } catch (err) {
        console.error('Failed to create Python profiling wrapper, running raw script:', err)
      }
    }

    // Spawn a dedicated terminal tab for this command run
    const { id } = await window.electron.terminal.create({ cwd: store.rootPath || undefined })
    addTerminal({ id, name: `Run: ${activeTab.name}` })
    setTerminalPanelOpen(true)
    useStore.setState({ activeTerminalId: id })
    setTimeout(() => {
      window.electron.terminal.write(id, `${finalCmd}\r`)
    }, 500)
  }, [activeTab, localContent, addTerminal, setTerminalPanelOpen])

  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !editorLoaded) return

    const handleSave = async () => {
      if (!activeTab || !window.electron) return
      try {
        await window.electron.fs.writeFile(activeTab.path, localContent)
        setTabDirty(activeTabId, false)
        
        // Trigger diagnostics after save if LSP is available
        if (window.electron.lsp && window.electron.lsp.checkDiagnostics) {
          window.electron.lsp.checkDiagnostics(activeTab.path)
        }
        
        // Trigger extension host
        import('../../utils/extensionHost.js').then(({ extensionHost }) => {
          extensionHost.triggerSave(activeTab.path)
        })
      } catch (err) {
        console.error('[CodeCanvas] Save error:', err)
      }
    }

    const handleSaveAs = async () => {
      if (!activeTab || !window.electron) return
      try {
        const newPath = window.prompt('Save As - Enter path:', activeTab.path)
        if (newPath) {
          await window.electron.fs.writeFile(newPath, localContent)
          const name = newPath.split(/[/\\]/).pop()
          useStore.getState().openTab({ name, path: newPath, content: localContent, language: name.split('.').pop() || 'plaintext' })
        }
      } catch (err) {
        console.error('[CodeCanvas] Save As error:', err)
      }
    }

    const handleUndo = () => { editor.focus(); editor.trigger('menu', 'undo') }
    const handleRedo = () => { editor.focus(); editor.trigger('menu', 'redo') }
    const handleToggleFolding = () => {
      editor.focus()
      const action = editor.getAction('editor.action.toggleFold')
      if (action) {
        action.run()
      } else {
        editor.trigger('menu', 'editor.action.toggleFold')
      }
    }
    const handleSelectAll = () => { editor.focus(); editor.trigger('menu', 'editor.action.selectAll') }
    const handleNextMatch = () => { editor.focus(); editor.trigger('menu', 'editor.action.nextMatchFindAction') }
    const handleAddMultiCursor = () => { editor.focus(); editor.trigger('menu', 'editor.action.insertCursorBelow') }
    
    const handleCenteredLayout = () => {
      const current = editor.getOption(monaco.editor.EditorOption.centeredLayout)
      editor.updateOptions({ centeredLayout: !current })
    }

    const handleGotoDefinition = () => editor.trigger('keyboard', 'editor.action.revealDefinition')
    const handleGotoDeclaration = () => editor.trigger('keyboard', 'editor.action.revealDeclaration')
    const handleGotoTypeDefinition = () => editor.trigger('keyboard', 'editor.action.goToTypeDefinition')
    const handleGotoImplementation = () => editor.trigger('keyboard', 'editor.action.goToImplementation')
    const handleNextProblem = () => editor.trigger('keyboard', 'editor.action.marker.nextInFiles')
    const handlePrevProblem = () => editor.trigger('keyboard', 'editor.action.marker.prevInFiles')
    const handleFindReferences = () => editor.trigger('keyboard', 'editor.action.goToReferences')
    const handleRenameSymbol = () => editor.trigger('keyboard', 'editor.action.rename')

    const handleDebugStart = async () => {
      if (!activeTab || !window.electron) return
      useStore.setState({ activeSidebarTab: 'debug' })
      const res = await window.electron.debug.launch({ filePath: activeTab.path, breakOnStart: false })
      if (res && res.error) {
        const store = useStore.getState();
        store.appendOutputLog('error', 'Launch error: ' + res.error);
        store.setActiveSidebarTab('output');
        return
      }
    }

    const handleDebugStop = () => window.electron.debug.stop()
    const handleDebugStepOver = () => window.electron.debug.stepOver()
    const handleDebugStepInto = () => window.electron.debug.stepInto()
    const handleDebugStepOut = () => window.electron.debug.stepOut()

    // Bind events to both window and document to ensure absolute bulletproof event capturing
    const events = [
      { name: 'aeres:editor-save', handler: handleSave },
      { name: 'aeres:editor-save-as', handler: handleSaveAs },
      { name: 'aeres:editor-undo', handler: handleUndo },
      { name: 'aeres:editor-redo', handler: handleRedo },
      { name: 'aeres:editor-cut', handler: handleCut },
      { name: 'aeres:editor-copy', handler: handleCopy },
      { name: 'aeres:editor-paste', handler: handlePaste },
      { name: 'aeres:editor-toggle-folding', handler: handleToggleFolding },
      { name: 'aeres:editor-select-all', handler: handleSelectAll },
      { name: 'aeres:editor-next-match', handler: handleNextMatch },
      { name: 'aeres:editor-add-multicursor', handler: handleAddMultiCursor },
      { name: 'aeres:editor-centered-layout', handler: handleCenteredLayout },
      { name: 'aeres:editor-goto-definition', handler: handleGotoDefinition },
      { name: 'aeres:editor-goto-declaration', handler: handleGotoDeclaration },
      { name: 'aeres:editor-goto-type-definition', handler: handleGotoTypeDefinition },
      { name: 'aeres:editor-goto-implementation', handler: handleGotoImplementation },
      { name: 'aeres:editor-next-problem', handler: handleNextProblem },
      { name: 'aeres:editor-prev-problem', handler: handlePrevProblem },
      { name: 'aeres:editor-find-references', handler: handleFindReferences },
      { name: 'aeres:editor-rename-symbol', handler: handleRenameSymbol },
      { name: 'aeres:debug-start', handler: handleDebugStart },
      { name: 'aeres:debug-stop', handler: handleDebugStop },
      { name: 'aeres:debug-step-over', handler: handleDebugStepOver },
      { name: 'aeres:debug-step-into', handler: handleDebugStepInto },
      { name: 'aeres:debug-step-out', handler: handleDebugStepOut },
      { name: 'aeres:editor-back', handler: () => editor?.trigger('keyboard', 'cursorUndo') },
      { name: 'aeres:editor-forward', handler: () => editor?.trigger('keyboard', 'cursorRedo') },
      { name: 'aeres:editor-goto-line', handler: () => editor?.trigger('keyboard', 'editor.action.gotoLine') },
      { name: 'aeres:open-live-server', handler: handleOpenLiveServer },
      { name: 'aeres:run-active-file', handler: handleRunFile },
      { name: 'aeres:new-terminal', handler: () => {
          useStore.setState({ terminalPanelOpen: true })
          setTimeout(() => window.dispatchEvent(new CustomEvent('aeres:select-terminal-tab', { detail: 'terminal' })), 50)
      } }
    ]

    events.forEach(e => {
      window.addEventListener(e.name, e.handler)
      document.addEventListener(e.name, e.handler)
    })

    return () => {
      events.forEach(e => {
        window.removeEventListener(e.name, e.handler)
        document.removeEventListener(e.name, e.handler)
      })
    }
  }, [editorLoaded, activeTab, activeTabId, localContent, setTabDirty, handleCut, handleCopy, handlePaste, handleRunFile, handleOpenLiveServer])

  useEffect(() => {
    const handler = () => handleModernize()
    window.addEventListener('aeres:modernize', handler)
    document.addEventListener('aeres:modernize', handler)
    return () => {
      window.removeEventListener('aeres:modernize', handler)
      document.removeEventListener('aeres:modernize', handler)
    }
  }, [handleModernize])

  // ── ESLint Extension Diagnostics ──
  // Real diagnostics are provided by the LSP listener in App.jsx.
  // If the ESLint extension is toggled off, clear any stale markers for the active file.
  const hasEslint = installedExtensions.includes('eslint') && !disabledExtensions.includes('eslint')
  const fileDiagnostics = useStore(s => activeTab?.path ? s.diagnostics[activeTab.path] : null)
  
  useEffect(() => {
    if (!activeTab) return
    if (!hasEslint) {
      // Clear any eslint markers when the extension is disabled
      const store = useStore.getState()
      const existing = store.diagnostics[activeTab.path] || []
      const nonEslint = existing.filter(m => !m.message?.startsWith('eslint('))
      store.setDiagnostics(activeTab.path, nonEslint)
    }
  }, [activeTab?.path, hasEslint])

  // ── Apply LSP Diagnostics to Monaco ──
  useEffect(() => {
    if (!activeTab?.path || !editorLoaded || !window.electron?.lsp) return
    const editor = editorRef.current
    if (!editor) return

    const uri = `file:///${activeTab.path.replace(/\\/g, '/')}`
    documentVersions.current[uri] = 1
    const activeLang = activeTab.language === 'javascriptreact' ? 'javascript' : activeTab.language === 'typescriptreact' ? 'typescript' : activeTab.language

    window.electron.lsp.notify(activeLang, 'textDocument/didOpen', {
      textDocument: { 
        uri, 
        languageId: activeTab.language, 
        version: documentVersions.current[uri], 
        text: editor.getModel()?.getValue() || ''
      }
    })
  }, [activeTab?.path, activeTab?.language, editorLoaded])

  // ── Auto Save ──
  useEffect(() => {
    if (!activeTab?.path || !activeTab?.isDirty || !window.electron) return
    
    const timeoutId = setTimeout(async () => {
      try {
        await window.electron.fs.writeFile(activeTab.path, localContent)
        const store = useStore.getState()
        if (store.activeTabId === activeTab.id) {
          store.setTabDirty(activeTab.id, false)
        }
      } catch (err) {
        console.error('[CodeCanvas] Auto-save error:', err)
      }
    }, 1000)
    
    return () => clearTimeout(timeoutId)
  }, [localContent, activeTab?.path, activeTab?.isDirty, activeTab?.id])

  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeTab?.path || !editorLoaded) return
    const model = editor.getModel()
    if (!model) return

    const markers = (fileDiagnostics || []).map(d => {
      let severity = monaco.MarkerSeverity.Error
      if (d.severity === 'warning') severity = monaco.MarkerSeverity.Warning
      else if (d.severity === 'info') severity = monaco.MarkerSeverity.Info

      return {
        startLineNumber: d.line,
        startColumn: d.startColumn || 1,
        endLineNumber: d.endLine || d.line,
        endColumn: d.endColumn || 1000,
        message: d.message,
        severity: severity,
        source: 'LSP'
      }
    })
    
    monaco.editor.setModelMarkers(model, 'aeres-lsp', markers)
  }, [activeTab?.path, fileDiagnostics, editorLoaded])

  // ── GitLens Elite Blame Annotations ──
  const hasGitLens = installedExtensions.includes('gitlens-elite') && !disabledExtensions.includes('gitlens-elite')
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeTab || !editorLoaded) return

    let decs = []
    if (hasGitLens) {
      const position = editor.getPosition()
      if (position) {
        const line = position.lineNumber
        decs.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            after: {
              content: '    👤 Shlok, 2 days ago • Initial commit',
              inlineClassName: 'text-slate-500 italic text-[10px] opacity-40 ml-4 pointer-events-none select-none'
            }
          }
        })
      }
    }
    
    // Set decorators
    const prevDecs = editor.gitLensDecorations || []
    editor.gitLensDecorations = editor.deltaDecorations(prevDecs, decs)

    // Listen for cursor position change
    const disposable = editor.onDidChangeCursorPosition(() => {
      const pos = editor.getPosition()
      if (!pos) return
      let newDecs = []
      const store = useStore.getState()
      if (store.installedExtensions.includes('gitlens-elite') && !store.disabledExtensions.includes('gitlens-elite')) {
        newDecs.push({
          range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
          options: {
            isWholeLine: true,
            after: {
              content: '    👤 Shlok, 2 days ago • Initial commit',
              inlineClassName: 'text-slate-500 italic text-[10px] opacity-40 ml-4 pointer-events-none select-none'
            }
          }
        })
      }
      editor.gitLensDecorations = editor.deltaDecorations(editor.gitLensDecorations || [], newDecs)
    })

    return () => disposable.dispose()
  }, [activeTab?.path, hasGitLens, editorLoaded])

  if (!activeTab) {
    return (
      <div className="flex h-full flex-col">
        {tabs.length > 0 && <EditorTabs />}
        <WelcomeScreen />
      </div>
    )
  }

  const showDiff = modernizeState === 'streaming' || modernizeState === 'done'

  return (
    <div className="flex h-full flex-col">
      <EditorTabs />

      {/* Toolbar */}
      <div className="flex h-8 shrink-0 items-center gap-3 border-b border-aeres-border bg-aeres-surface px-3">
        <span className="truncate text-xs text-aeres-muted">
          {(activeTab.path || activeTab.name || 'Untitled').split(/[/\\]/).slice(-2).join('/')}
        </span>
        <span className="rounded bg-aeres-violet/20 px-1.5 py-px text-[10px] font-medium text-aeres-violet">
          {activeTab.language}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleRunFile}
            title="Run File"
            className="flex h-6 w-6 items-center justify-center rounded text-green-500 hover:bg-green-500/10 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button
            type="button"
            onClick={() => useStore.setState({ activeRightTab: 'debug' })}
            title="Debug File"
            className="flex h-6 w-6 items-center justify-center rounded text-blue-400 hover:bg-blue-400/10 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2M7.88 4.88l1.41 1.41M16.12 4.88l-1.41 1.41M4.88 7.88l1.41 1.41M19.12 7.88l-1.41 1.41M2 12h2M20 12h2M4.88 16.12l1.41-1.41M19.12 16.12l-1.41-1.41M7.88 19.12l1.41-1.41M16.12 19.12l-1.41 1.41M12 20v2"/></svg>
          </button>
        </div>

        <button
          type="button"
          onClick={handleModernize}
          disabled={modernizeState === 'scanning' || modernizeState === 'streaming'}
          title="Modernize Code: Ask the AI Agent to scan this file for deprecations and suggest small snippet replacements."
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-medium text-white shadow-sm transition ${
            modernizeState === 'scanning' || modernizeState === 'streaming'
              ? 'bg-aeres-violet/60 cursor-not-allowed animate-pulse'
              : 'bg-aeres-violet hover:opacity-90'
          }`}
        >
          {modernizeState === 'scanning' || modernizeState === 'streaming' ? (
             <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          )}
          {modernizeState === 'scanning' ? 'Scanning DB...' : modernizeState === 'streaming' ? 'Modernizing...' : 'Modernize'}
        </button>
      </div>

      {/* Source URL bar */}
      {showDiff && sourceUrl && (
        <div className="flex h-6 shrink-0 items-center gap-2 border-b border-aeres-border bg-aeres-surface/50 px-3">
          <span className="text-[10px] text-aeres-muted">Source:</span>
          <span className="truncate text-[10px] text-aeres-blue">{sourceUrl}</span>
        </div>
      )}

      {/* Editor / Diff */}
      <div className="min-h-0 flex-1">
        {showDiff ? (
          <DiffEditor
            height="100%"
            original={originalCode}
            modified={fixedCode}
            language={activeTab.language}
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
        ) : (
          <Editor
            height="100%"
            path={activeTab.path}
            language={activeTab.language}
            defaultValue={activeTab.content || ''}
            theme={theme?.includes('light') ? 'vs' : 'vs-dark'}
            onChange={handleChange}
            onMount={(editor, monaco) => {
              editorRef.current = editor
              monacoRef.current = monaco
              setEditorInstance(editor)
              setEditorLoaded(true)

              // Setup Emmet for rapid boilerplate and element creation
              try {
                emmetHTML(monaco)
                emmetCSS(monaco)
                emmetJSX(monaco)
              } catch (err) {
                console.warn('Failed to initialize Emmet:', err)
              }

              // ── Register LSP WebSocket Completion Provider ──
              let lspWs = null
              const backendPort = useStore.getState().backendUrl?.split(':').pop() || 8008
              try {
                const backendUrl = useStore.getState().backendUrl || 'http://127.0.0.1:8008'
                const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://')
                lspWs = new WebSocket(`${wsUrl}/api/lsp/ws`)
                lspWs.onopen = () => console.log('[LSP WS] Connected')
              } catch (e) {
                console.warn('[LSP WS] Connection failed', e)
              }

              let lspCompletionResolvers = {}
              let messageCounter = 0

              if (lspWs) {
                lspWs.onmessage = (e) => {
                  try {
                    const msg = JSON.parse(e.data)
                    if (msg.type === 'completion_result' && lspCompletionResolvers[msg.id]) {
                      lspCompletionResolvers[msg.id](msg.completions)
                      delete lspCompletionResolvers[msg.id]
                    }
                  } catch (err) {}
                }

                monaco.languages.registerCompletionItemProvider(['javascript', 'python', 'typescript'], {
                  provideCompletionItems: (model, position) => {
                    return new Promise((resolve) => {
                      if (lspWs.readyState !== WebSocket.OPEN) {
                        resolve({ suggestions: [] })
                        return
                      }
                      
                      const reqId = ++messageCounter
                      lspCompletionResolvers[reqId] = (completions) => {
                        const suggestions = completions.map(c => ({
                          label: c.label,
                          kind: monaco.languages.CompletionItemKind[c.kind === 'function' ? 'Function' : 'Variable'] || monaco.languages.CompletionItemKind.Text,
                          insertText: c.insertText,
                          detail: c.detail
                        }))
                        resolve({ suggestions })
                      }
                      
                      lspWs.send(JSON.stringify({
                        type: 'completion',
                        id: reqId,
                        path: model.uri.toString().replace('file://', ''),
                        content: model.getValue(),
                        line: position.lineNumber,
                        column: position.column
                      }))
                      
                      // Timeout
                      setTimeout(() => {
                        if (lspCompletionResolvers[reqId]) {
                          resolve({ suggestions: [] })
                          delete lspCompletionResolvers[reqId]
                        }
                      }, 2000)
                    })
                  }
                })
              }

              // ── Register debounced AI Inline Completion Provider ──
              let autocompleteTimer = null
              monaco.languages.registerInlineCompletionsProvider({ pattern: '**/*' }, {
                provideInlineCompletions: async (model, position, context, token) => {
                  const e = window.electron
                  if (!e?.rag?.autocomplete) return { items: [] }

                  return new Promise((resolve) => {
                    if (autocompleteTimer) clearTimeout(autocompleteTimer)
                    autocompleteTimer = setTimeout(async () => {
                      if (token.isCancellationRequested) {
                        resolve({ items: [] })
                        return
                      }

                      const lineText = model.getLineContent(position.lineNumber)
                      if (!lineText.trim()) {
                        resolve({ items: [] })
                        return
                      }

                      const value = model.getValue()
                      const offset = model.getOffsetAt(position)
                      const prefix = value.substring(Math.max(0, offset - 1500), offset)
                      const suffix = value.substring(offset, Math.min(value.length, offset + 1500))

                      try {
                        const res = await e.rag.autocomplete({
                          prefix,
                          suffix,
                          language: model.getLanguageId(),
                          filePath: model.uri.toString()
                        })

                        if (res?.suggestion && !token.isCancellationRequested) {
                          let suggestionText = res.suggestion

                          // Smart prefix overlap resolution
                          const typedOnLine = lineText.substring(0, position.column - 1)
                          
                          // 1. Exact or case-insensitive prefix match
                          if (suggestionText.toLowerCase().startsWith(typedOnLine.toLowerCase())) {
                            suggestionText = suggestionText.substring(typedOnLine.length)
                          } else {
                            // 2. Overlap resolution (find longest overlapping suffix of typedOnLine and prefix of suggestion)
                            let overlapLength = 0
                            const maxOverlap = Math.min(typedOnLine.length, suggestionText.length)
                            for (let i = 1; i <= maxOverlap; i++) {
                              const suffix = typedOnLine.substring(typedOnLine.length - i)
                              const prefixOfSuggestion = suggestionText.substring(0, i)
                              if (suffix.toLowerCase() === prefixOfSuggestion.toLowerCase()) {
                                overlapLength = i
                              }
                            }
                            if (overlapLength > 0) {
                              suggestionText = suggestionText.substring(overlapLength)
                            }
                          }

                          if (!suggestionText.trim()) {
                            resolve({ items: [] })
                            return
                          }

                          resolve({
                            items: [
                              {
                                insertText: suggestionText,
                                range: new monaco.Range(
                                  position.lineNumber,
                                  position.column,
                                  position.lineNumber,
                                  position.column
                                )
                              }
                            ]
                          })
                          return
                        }
                      } catch (err) {
                        console.error('[Autocomplete] Monaco provider error:', err)
                      }
                      resolve({ items: [] })
                    }, 400)
                  })
                },
                freeInlineCompletions: () => {}
              })

              // ── Register Symbol Documentation Hover Provider ──
              const docMappings = {
                // React Hooks
                'useState': {
                  title: 'React.useState',
                  desc: 'useState is a React Hook that lets you add a state variable to your component.',
                  url: 'https://react.dev/reference/react/useState'
                },
                'useEffect': {
                  title: 'React.useEffect',
                  desc: 'useEffect is a React Hook that lets you synchronize a component with an external system.',
                  url: 'https://react.dev/reference/react/useEffect'
                },
                'useContext': {
                  title: 'React.useContext',
                  desc: 'useContext is a React Hook that lets you read and subscribe to context from your component.',
                  url: 'https://react.dev/reference/react/useContext'
                },
                'useRef': {
                  title: 'React.useRef',
                  desc: 'useRef is a React Hook that lets you reference a value that’s not needed for rendering.',
                  url: 'https://react.dev/reference/react/useRef'
                },
                'useMemo': {
                  title: 'React.useMemo',
                  desc: 'useMemo is a React Hook that lets you cache the result of a calculation between re-renders.',
                  url: 'https://react.dev/reference/react/useMemo'
                },
                'useCallback': {
                  title: 'React.useCallback',
                  desc: 'useCallback is a React Hook that lets you cache a callback definition between re-renders.',
                  url: 'https://react.dev/reference/react/useCallback'
                },

                // DOM Builtins
                'getElementById': {
                  title: 'Document.getElementById',
                  desc: 'The getElementById() method of the Document interface returns an Element object whose id property matches the specified string.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById'
                },
                'querySelector': {
                  title: 'Document.querySelector',
                  desc: 'The querySelector() method of the ParentNode interface returns the first Element within the document that matches the specified group of selectors.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector'
                },
                'querySelectorAll': {
                  title: 'Document.querySelectorAll',
                  desc: 'The querySelectorAll() method of the ParentNode interface returns a static NodeList representing a list of the document\'s elements that match the specified group of selectors.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll'
                },
                'addEventListener': {
                  title: 'EventTarget.addEventListener',
                  desc: 'The addEventListener() method of the EventTarget interface sets up a function that will be called whenever the specified event is delivered to the target.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener'
                },
                'fetch': {
                  title: 'WindowOrWorkerGlobalScope.fetch',
                  desc: 'The fetch() method of the WindowOrWorkerGlobalScope mixin starts the process of fetching a resource from the network, returning a promise which is fulfilled once the response is available.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/API/fetch'
                },

                // Python builtins
                'len': {
                  title: 'Python Built-in Functions: len()',
                  desc: 'Return the length (the number of items) of an object. The argument may be a sequence (such as a string, bytes, tuple, list, or range) or a collection (such as a dictionary, set, or frozen set).',
                  url: 'https://docs.python.org/3/library/functions.html#len'
                },
                'print': {
                  title: 'Python Built-in Functions: print()',
                  desc: 'Print objects to the text stream file, separated by sep and followed by end. sep, end, file, and flush, if present, must be given as keyword arguments.',
                  url: 'https://docs.python.org/3/library/functions.html#print'
                },
                'range': {
                  title: 'Python Built-in Functions: range()',
                  desc: 'Rather than being a function, range is actually an immutable sequence type, whose occurrence is commonly used for looping a specific number of times in for loops.',
                  url: 'https://docs.python.org/3/library/stdtypes.html#range'
                },
                'zip': {
                  title: 'Python Built-in Functions: zip()',
                  desc: 'Iterate over several iterables in parallel, producing tuples with an item from each.',
                  url: 'https://docs.python.org/3/library/functions.html#zip'
                },
                'enumerate': {
                  title: 'Python Built-in Functions: enumerate()',
                  desc: 'Return an enumerate object. iterable must be a sequence, an iterator, or some other object which supports iteration.',
                  url: 'https://docs.python.org/3/library/functions.html#enumerate'
                }
              }

              const htmlTags = {
                'div': {
                  title: 'HTML Element: <div>',
                  desc: 'The Content Division element is the generic container for flow content. It has no effect on the content or layout until styled in some way using CSS.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div'
                },
                'span': {
                  title: 'HTML Element: <span>',
                  desc: 'The Content Span element is a generic inline container for phrasing content, which does not inherently represent anything. It can be used to group elements for styling purposes.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span'
                },
                'a': {
                  title: 'HTML Element: <a>',
                  desc: 'The Anchor element (with its href attribute) creates a hyperlink to web pages, files, email addresses, locations in the same page, or anything else a URL can address.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a'
                },
                'p': {
                  title: 'HTML Element: <p>',
                  desc: 'The Paragraph element represents a paragraph of text. Paragraphs are usually represented in visual media as blocks of text separated from adjacent blocks by blank lines and/or first-line indentation.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p'
                },
                'img': {
                  title: 'HTML Element: <img>',
                  desc: 'The Image element embeds an image into the document.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img'
                },
                'button': {
                  title: 'HTML Element: <button>',
                  desc: 'The Button element represents a clickable button, used to submit forms or anywhere in a document for accessible, standard button functionality.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button'
                },
                'input': {
                  title: 'HTML Element: <input>',
                  desc: 'The Input element is used to create interactive controls for web-based forms in order to accept data from the user.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input'
                },
                'h1': {
                  title: 'HTML Element: <h1>',
                  desc: 'The HTML Section Heading elements represent six levels of section headings. <h1> is the highest section level and <h6> is the lowest.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements'
                },
                'h2': {
                  title: 'HTML Element: <h2>',
                  desc: 'The HTML Section Heading elements represent six levels of section headings.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements'
                },
                'h3': {
                  title: 'HTML Element: <h3>',
                  desc: 'The HTML Section Heading elements represent six levels of section headings.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements'
                },
                'ul': {
                  title: 'HTML Element: <ul>',
                  desc: 'The Unordered List element represents an unordered list of items, typically rendered as a bulleted list.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul'
                },
                'ol': {
                  title: 'HTML Element: <ol>',
                  desc: 'The Ordered List element represents an ordered list of items, typically rendered as a numbered list.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol'
                },
                'li': {
                  title: 'HTML Element: <li>',
                  desc: 'The List Item element is used to represent an item in a list (ordered or unordered).',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li'
                },
                'form': {
                  title: 'HTML Element: <form>',
                  desc: 'The Form element represents a document section containing interactive controls for submitting information.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form'
                },
                'body': {
                  title: 'HTML Element: <body>',
                  desc: 'The HTML Body element represents the content of an HTML document. There can be only one <body> element in a document.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body'
                },
                'html': {
                  title: 'HTML Element: <html>',
                  desc: 'The HTML Document element represents the root (top-level element) of an HTML document, so it is also referred to as the root element. All other elements must be descendants of this element.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html'
                }
              }

              const cssProps = {
                'display': {
                  title: 'CSS Property: display',
                  desc: 'Sets whether an element is treated as a block or inline element and the layout used for its children, such as flow, grid, or flex.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/display'
                },
                'position': {
                  title: 'CSS Property: position',
                  desc: 'Sets how an element is positioned in a document. The top, right, bottom, and left properties determine the final location of positioned elements.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/position'
                },
                'margin': {
                  title: 'CSS Property: margin',
                  desc: 'Sets the margin area on all four sides of an element. It is a shorthand for margin-top, margin-right, margin-bottom, and margin-left.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/margin'
                },
                'padding': {
                  title: 'CSS Property: padding',
                  desc: 'Sets the padding area on all four sides of an element. It is a shorthand for padding-top, padding-right, padding-bottom, and padding-left.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/padding'
                },
                'background': {
                  title: 'CSS Property: background',
                  desc: 'Shorthand property for setting most background properties at once, such as background-color, background-image, background-repeat, background-position, and background-size.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/background'
                },
                'color': {
                  title: 'CSS Property: color',
                  desc: 'Sets the foreground color value of an element\'s text content.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color'
                },
                'font-size': {
                  title: 'CSS Property: font-size',
                  desc: 'Sets the size of the font. Changing the font size also updates the sizes of font-relative length units, such as em, ex, etc.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/font-size'
                },
                'border': {
                  title: 'CSS Property: border',
                  desc: 'Shorthand property for setting an element\'s border width, style, and color.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/border'
                },
                'flex': {
                  title: 'CSS Property: flex',
                  desc: 'Shorthand property that specifies how a flex item will grow or shrink to fit the space available in its flex container.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/flex'
                },
                'grid': {
                  title: 'CSS Property: grid',
                  desc: 'Shorthand property for setting all of the explicit and implicit grid properties in a single declaration.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/grid'
                },
                'width': {
                  title: 'CSS Property: width',
                  desc: 'Sets the width of an element. By default, the property limits the width of the content area.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/width'
                },
                'height': {
                  title: 'CSS Property: height',
                  desc: 'Sets the height of an element. By default, the property limits the height of the content area.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/height'
                },
                'opacity': {
                  title: 'CSS Property: opacity',
                  desc: 'Sets the opacity of an element. Opacity is the degree to which content behind an element is hidden, and is the opposite of transparency.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/opacity'
                },
                'transition': {
                  title: 'CSS Property: transition',
                  desc: 'Shorthand property for transition-property, transition-duration, transition-timing-function, and transition-delay.',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/transition'
                }
              }

              monaco.languages.registerHoverProvider({ pattern: '**/*' }, {
                provideHover: (model, position) => {
                  const word = model.getWordAtPosition(position)
                  if (!word) return null

                  const language = model.getLanguageId()
                  const searchWord = word.word.toLowerCase()

                  // 1. Handle HTML tags
                  if (language === 'html' || model.uri.path.endsWith('.html')) {
                    const match = htmlTags[searchWord]
                    if (match) {
                      return {
                        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                        contents: [
                          { value: `**${match.title}**` },
                          { value: match.desc },
                          { value: `🌐 [MDN Reference](${match.url})` }
                        ]
                      }
                    } else {
                      // Fallback dynamically for any other tag
                      return {
                        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                        contents: [
                          { value: `**HTML Element: <${searchWord}>**` },
                          { value: `Standard HTML element representing tag name \`${word.word}\`.` },
                          { value: `🌐 [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/${searchWord})` }
                        ]
                      }
                    }
                  }

                  // 2. Handle CSS properties
                  if (language === 'css' || model.uri.path.endsWith('.css')) {
                    const match = cssProps[searchWord]
                    if (match) {
                      return {
                        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                        contents: [
                          { value: `**${match.title}**` },
                          { value: match.desc },
                          { value: `🌐 [MDN Reference](${match.url})` }
                        ]
                      }
                    } else {
                      // Fallback dynamically for any other property
                      return {
                        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                        contents: [
                          { value: `**CSS Property: ${searchWord}**` },
                          { value: `Standard CSS rule or value matching property \`${word.word}\`.` },
                          { value: `🌐 [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/${searchWord})` }
                        ]
                      }
                    }
                  }

                  // 3. Standard built-in fallback
                  const match = docMappings[word.word]
                  if (!match) return null

                  return {
                    range: new monaco.Range(
                      position.lineNumber,
                      word.startColumn,
                      position.lineNumber,
                      word.endColumn
                    ),
                    contents: [
                      { value: `**${match.title}**` },
                      { value: match.desc },
                      { value: `🌐 [Official Documentation Reference](${match.url})` }
                    ]
                  }
                }
              })

              // Disable both semantic and syntax validation from Monaco's built-in TypeScript worker.
              // Real diagnostics are provided by the actual LSP server running in the main process.
              // Monaco's built-in checker produces false positives on comments, incomplete code, and non-standard patterns.
              if (monaco.languages.typescript) {
                monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                  jsx: 1, // 1 = JsxEmit.Preserve (highly standard for Monaco TSX syntax checks)
                  allowNonTsExtensions: true,
                  target: monaco.languages.typescript.ScriptTarget.Latest,
                })
                
                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: true,
                  noSyntaxValidation: true,
                })
                monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: true,
                  noSyntaxValidation: true,
                })
              }

              // Listen for cursor position changes
              editor.onDidChangeCursorPosition((e) => {
                const pos = e.position
                useStore.setState({ cursorLine: pos.lineNumber, cursorColumn: pos.column })
              })

              // Intercept context menu to show custom brutalist Y2K popup
              editor.onContextMenu((e) => {
                e.event.preventDefault()
                e.event.stopPropagation()
                setContextMenu({
                  visible: true,
                  x: e.event.posx,
                  y: e.event.posy
                })
              })

              // Listen for selection changes
              editor.onDidChangeCursorSelection((e) => {
                const selection = e.selection
                if (selection && !selection.isEmpty()) {
                  const model = editor.getModel()
                  if (model) {
                    const text = model.getValueInRange(selection)
                    const charCount = text.length
                    const lineCount = selection.endLineNumber - selection.startLineNumber + 1
                    useStore.setState({ 
                      selectedCount: charCount,
                      selectedLinesCount: lineCount > 1 ? lineCount : 0
                    })
                  }
                } else {
                  useStore.setState({ selectedCount: 0, selectedLinesCount: 0 })
                }
              })

              // Keyboard triggers bubble-up triggers from Monaco Editor
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma, () => {
                document.dispatchEvent(new CustomEvent('aeres:open-settings'))
              })
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX, () => {
                document.dispatchEvent(new CustomEvent('aeres:open-extensions'))
              })
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
                document.dispatchEvent(new CustomEvent('aeres:open-palette'))
              })
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
                document.dispatchEvent(new CustomEvent('aeres:open-quickopen'))
              })

              editor.addAction({
                id: 'aeres.causalBlame',
                label: 'Aeres: Trace cause chain',
                contextMenuGroupId: 'aeres',
                contextMenuOrder: 3,
                run: async (ed) => {
                  const pos = ed.getPosition()
                  const word = ed.getModel().getWordAtPosition(pos)
                  if (!word) return
                  const rootPath = useStore.getState().rootPath
                  useStore.setState({ activeRightTab: 'causemap' })
                  useStore.setState({
                    causalTarget: {
                      filePath: activeTab.path,
                      functionName: word.word,
                      repoPath: rootPath,
                    },
                  })
                },
              })

              editor.addAction({
                id: 'aeres.openLiveServer',
                label: 'Open with Live Server',
                contextMenuGroupId: 'aeres',
                contextMenuOrder: 1,
                run: async (ed) => {
                  const store = useStore.getState()
                  const activeTab = store.tabs.find(t => t.id === store.activeTabId)
                  if (!activeTab || !activeTab.path) return
                  const isHTML = activeTab.name.endsWith('.html') || activeTab.name.endsWith('.htm')
                  if (!isHTML) {
                    const store = useStore.getState();
                    store.appendOutputLog('error', "Live Server only supports HTML files!");
                    store.setActiveSidebarTab('output');
                    return
                  }
                  if (!window.electron) return
                  const { id } = await window.electron.terminal.create({ cwd: store.rootPath || undefined })
                  store.addTerminal({ id, name: `Server: ${activeTab.name}` })
                  store.setTerminalPanelOpen(true)
                  useStore.setState({ activeTerminalId: id })
                  
                  // live-server defaults to 8080. We track it in store for the "Copy Link" feature.
                  store.setbackendUrl('http://127.0.0.1:8080')
                  
                  setTimeout(() => {
                    const isMac = window.electron.isMac
                    const openCmd = isMac ? 'open' : 'start ""'
                    window.electron.terminal.write(id, `npx -y live-server "${activeTab.path}" || ${openCmd} "${activeTab.path}"\r`)
                  }, 500)
                },
              })
              // --- URL Hover Link Opener ---
              monaco.languages.registerHoverProvider('*', {
                provideHover: (model, position) => {
                  const lineContent = model.getLineContent(position.lineNumber)
                  const urlRegex = /(https?:\/\/[^\s"'`()<>]+)/g
                  let match
                  while ((match = urlRegex.exec(lineContent)) !== null) {
                    const startColumn = match.index + 1
                    const endColumn = startColumn + match[0].length
                    if (position.column >= startColumn && position.column <= endColumn) {
                      return {
                        range: new monaco.Range(position.lineNumber, startColumn, position.lineNumber, endColumn),
                        contents: [
                          { value: `**Follow Link**` },
                          { value: `🌐 [${match[0]}](${match[0]})` },
                          { value: `*(Click link to open in browser)*` }
                        ]
                      }
                    }
                  }
                  return null
                }
              })

              // --- LSP Providers ---
              const getLspLanguage = (lang) => {
                if (lang === 'javascriptreact') return 'javascript'
                if (lang === 'typescriptreact') return 'typescript'
                return lang
              }
              const lspLanguages = [
                'python', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
                'html', 'css', 'json', 'go', 'rust', 'java', 'cpp', 'c', 'yaml', 
                'dart', 'ruby', 'php', 'lua', 'kotlin', 'csharp', 'swift', 'elixir', 
                'haskell', 'zig'
              ]
              const language = activeTab.language

              if (lspLanguages.includes(language) && window.electron?.lsp) {
                const activeLang = getLspLanguage(language)
                // Ensure server is started
                const storeState = useStore.getState()
                window.electron.lsp.start(activeLang, storeState.rootPath, storeState.activeEnvironment?.binPath)

                monaco.languages.registerCompletionItemProvider(language, {
                  triggerCharacters: ['.', '/', '@', '<', '>', ':', '"', "'", '=', '-'],
                  provideCompletionItems: async (model, position) => {
                    const res = await window.electron.lsp.request(activeLang, 'textDocument/completion', {
                      textDocument: { uri: `file:///${activeTab.path.replace(/\\/g, '/')}` },
                      position: { line: position.lineNumber - 1, character: position.column - 1 }
                    })
                    return { suggestions: (res?.items || res || []).map(i => ({
                      label: i.label,
                      kind: i.kind,
                      insertText: i.insertText || i.label,
                      documentation: i.documentation,
                      range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column }
                    })) }
                  }
                })

                monaco.languages.registerHoverProvider(language, {
                  provideHover: async (model, position) => {
                    const res = await window.electron.lsp.request(activeLang, 'textDocument/hover', {
                      textDocument: { uri: `file:///${activeTab.path.replace(/\\/g, '/')}` },
                      position: { line: position.lineNumber - 1, character: position.column - 1 }
                    })
                    if (!res?.contents) return null
                    return {
                      contents: Array.isArray(res.contents) ? res.contents : [res.contents],
                      range: res.range
                    }
                  }
                })

                monaco.languages.registerDefinitionProvider(language, {
                  provideDefinition: async (model, position) => {
                    const res = await window.electron.lsp.request(activeLang, 'textDocument/definition', {
                      textDocument: { uri: `file:///${activeTab.path.replace(/\\/g, '/')}` },
                      position: { line: position.lineNumber - 1, character: position.column - 1 }
                    })
                    if (!res) return null
                    const locs = Array.isArray(res) ? res : [res]
                    return locs.map(l => ({
                      uri: monaco.Uri.parse(l.uri),
                      range: {
                        startLineNumber: l.range.start.line + 1,
                        startColumn: l.range.start.character + 1,
                        endLineNumber: l.range.end.line + 1,
                        endColumn: l.range.end.character + 1
                      }
                    }))
                  }
                })

                monaco.languages.registerReferenceProvider(language, {
                  provideReferences: async (model, position) => {
                    const res = await window.electron.lsp.request(activeLang, 'textDocument/references', {
                      textDocument: { uri: `file:///${activeTab.path.replace(/\\/g, '/')}` },
                      position: { line: position.lineNumber - 1, character: position.column - 1 },
                      context: { includeDeclaration: true }
                    })
                    return (res || []).map(l => ({
                      uri: monaco.Uri.parse(l.uri),
                      range: {
                        startLineNumber: l.range.start.line + 1,
                        startColumn: l.range.start.character + 1,
                        endLineNumber: l.range.end.line + 1,
                        endColumn: l.range.end.character + 1
                      }
                    }))
                  }
                })

                monaco.languages.registerRenameProvider(language, {
                  provideRenameEdits: async (model, position, newName) => {
                    const res = await window.electron.lsp.request(activeLang, 'textDocument/rename', {
                      textDocument: { uri: `file:///${activeTab.path.replace(/\\/g, '/')}` },
                      position: { line: position.lineNumber - 1, character: position.column - 1 },
                      newName
                    })
                    if (!res || !res.changes) return null
                    const edits = []
                    for (const uri in res.changes) {
                      for (const edit of res.changes[uri]) {
                        edits.push({
                          resource: monaco.Uri.parse(uri),
                          edit: {
                            range: {
                              startLineNumber: edit.range.start.line + 1,
                              startColumn: edit.range.start.character + 1,
                              endLineNumber: edit.range.end.line + 1,
                              endColumn: edit.range.end.character + 1
                            },
                            text: edit.newText
                          }
                        })
                      }
                    }
                    return { edits }
                  }
                })

                // --- LSP Synchronization moved to useEffect and handleChange ---
              }
              
              // --- VS Code Boilerplate Snippets ---
              const snippets = {
                'javascript': [
                  { label: 'clg', detail: 'console.log', insertText: 'console.log($1)' }
                ],
                'typescript': [
                  { label: 'clg', detail: 'console.log', insertText: 'console.log($1)' }
                ],
                'javascriptreact': [
                  { label: 'rfce', detail: 'React Functional Component', insertText: 'import React from "react"\n\nexport default function ${1:ComponentName}() {\n  return (\n    <div>\n      $2\n    </div>\n  )\n}' },
                  { label: 'usee', detail: 'useEffect', insertText: 'useEffect(() => {\n  $1\n  return () => {\n    $2\n  }\n}, [$3])' },
                  { label: 'uses', detail: 'useState', insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialState})' },
                  { label: 'clg', detail: 'console.log', insertText: 'console.log($1)' }
                ],
                'typescriptreact': [
                  { label: 'rfce', detail: 'React Functional Component', insertText: 'import React from "react"\n\nexport default function ${1:ComponentName}() {\n  return (\n    <div>\n      $2\n    </div>\n  )\n}' },
                  { label: 'usee', detail: 'useEffect', insertText: 'useEffect(() => {\n  $1\n  return () => {\n    $2\n  }\n}, [$3])' },
                  { label: 'uses', detail: 'useState', insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialState})' },
                  { label: 'clg', detail: 'console.log', insertText: 'console.log($1)' }
                ],
                'html': [
                  { label: '!', detail: 'HTML Boilerplate', insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${1:Document}</title>\n</head>\n<body>\n  $2\n</body>\n</html>' }
                ],
                'python': [
                  { label: 'for', detail: 'For Loop', insertText: 'for ${1:item} in ${2:iterable}:\n    $3' },
                  { label: 'def', detail: 'Function Definition', insertText: 'def ${1:function_name}($2):\n    $3' },
                  { label: 'class', detail: 'Class Definition', insertText: 'class ${1:ClassName}:\n    def __init__(self, $2):\n        $3' },
                  { label: 'ifm', detail: 'if __name__ == "__main__"', insertText: 'if __name__ == "__main__":\n    ${1:main()}' }
                ]
              }
              
              const mySnippets = snippets[language] || []
              if (mySnippets.length > 0) {
                monaco.languages.registerCompletionItemProvider(language, {
                  provideCompletionItems: (model, position) => {
                    const word = model.getWordUntilPosition(position)
                    const range = {
                      startLineNumber: position.lineNumber,
                      endLineNumber: position.lineNumber,
                      startColumn: word.startColumn,
                      endColumn: word.endColumn
                    }
                    return {
                      suggestions: mySnippets.map(s => ({
                        label: s.label,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        documentation: s.detail,
                        insertText: s.insertText,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range
                      }))
                    }
                  }
                })
              }

              // --- Breakpoint Management ---
              editor.onMouseDown((e) => {
                if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
                    e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
                  const line = e.target.position.lineNumber
                  useStore.getState().toggleBreakpoint(activeTab.path, line)
                }
              })
            }}
            options={{
              fontFamily: editorSettings.fontFamily,
              fontSize: editorSettings.fontSize,
              lineHeight: editorSettings.lineHeight,
              tabSize: editorSettings.tabSize,
              wordWrap: editorSettings.wordWrap,
              minimap: { enabled: editorSettings.minimap },
              automaticLayout: true,
              contextmenu: true,
              fixedOverflowWidgets: true,
              formatOnType: true,
              formatOnPaste: true,
              wordBasedSuggestions: 'allDocuments',
              suggest: {
                showWords: true,
                snippetsPreventQuickSuggestions: false,
              },
              bracketPairColorization: { enabled: true },
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              renderLineHighlight: 'all',
              guides: { bracketPairs: true, indentation: true },
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              folding: true,
              links: true,
              mouseWheelZoom: true,
              acceptSuggestionOnCommitCharacter: true,
              acceptSuggestionOnEnter: 'smart',
              snippetSuggestions: 'inline',
              inlineSuggest: { enabled: true },
              matchBrackets: 'always',
              showUnused: true,
              showDeprecated: true
            }}
          />
        )}
      </div>

      {/* Accept / Reject */}
      {showDiff && (
        <div className="flex h-10 shrink-0 items-center justify-center gap-3 border-t border-aeres-border bg-aeres-surface">
          <button
            type="button"
            onClick={handleAccept}
            disabled={modernizeState !== 'done'}
            className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-40 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Accept Fix
          </button>
          <button
            type="button"
            onClick={resetModernize}
            className="flex items-center gap-1.5 rounded-md border border-aeres-border bg-transparent px-4 py-1.5 text-xs font-medium text-aeres-muted transition hover:border-red-500 hover:text-red-400"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reject
          </button>
        </div>
      )}

      {/* Custom Y2K Neo-Brutalist Context Menu */}
      {contextMenu.visible && createPortal(
        <div 
          className="fixed z-[9999] w-64 rounded-2xl border-2 border-black bg-[#13141f] text-white p-1.5 shadow-[2px_2px_0px_#000] select-none font-sans max-h-[80vh] overflow-y-auto scrollbar-hide"
          style={{ 
            left: `${Math.min(contextMenu.x, window.innerWidth - 270)}px`, 
            top: `${Math.min(contextMenu.y, Math.max(0, window.innerHeight - 550))}px` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Live Server for HTML */}
          {isHTML && (
            <>
              <button onClick={() => { handleOpenLiveServer(); setContextMenu({ visible: false }) }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-violet-400 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all font-bold border border-dashed border-violet-500/30 hover:border-solid hover:border-black mb-1.5"
              >
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  Open with Live Server
                </span>
                <span className="text-[9px] opacity-65 font-mono">Alt+L</span>
              </button>
              <div className="h-[1px] bg-black/25 my-1" />
            </>
          )}

          {/* Group 1: Navigation */}
          <button onClick={() => { document.dispatchEvent(new CustomEvent('aeres:git-blame')); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-amber-400 hover:bg-amber-400 hover:text-black hover:font-bold rounded-xl transition-all border border-dashed border-amber-400/30 hover:border-solid hover:border-black mb-1.5"
          >
            <span>Trace cause chain (Git Blame)</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.revealDefinition'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Go to Definition</span>
            <span className="text-[9px] opacity-65 font-mono">F12</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.goToTypeDefinition'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Go to Type Definition</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.goToDeclaration'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Go to Source Definition</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.goToImplementation'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Go to Implementations</span>
            <span className="text-[9px] opacity-65 font-mono">Ctrl+F12</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.goToReferences'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Go to References</span>
            <span className="text-[9px] opacity-65 font-mono">Shift+F12</span>
          </button>

          {/* Peek Submenu */}
          <div>
            <button 
              onClick={() => setActivePeekSubmenu(!activePeekSubmenu)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition-all ${activePeekSubmenu ? 'bg-aeres-violet/20 text-violet-400 font-bold' : 'text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold'}`}
            >
              <span>Peek</span>
              <span className={`text-[9px] opacity-65 transition-transform ${activePeekSubmenu ? 'rotate-90' : ''}`}>▸</span>
            </button>
            {activePeekSubmenu && (
              <div className="pl-3 pr-1 py-1 flex flex-col gap-1 border-l-2 border-violet-500/20 ml-3.5 my-1 bg-black/10 rounded-r-xl animate-in slide-in-from-top-1 duration-100">
                <button onClick={() => { triggerMonacoAction('editor.action.peekDefinition'); setContextMenu({ visible: false }) }}
                  className="w-full text-left px-2 py-1.5 text-[11px] text-slate-300 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-lg transition-all"
                >
                  Peek Definition
                </button>
                <button onClick={() => { triggerMonacoAction('editor.action.peekReferences'); setContextMenu({ visible: false }) }}
                  className="w-full text-left px-2 py-1.5 text-[11px] text-slate-300 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-lg transition-all"
                >
                  Peek References
                </button>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-black/25 my-1" />

          {/* Group 2: Find References */}
          <button onClick={() => { triggerMonacoAction('editor.action.referenceSearch.trigger'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Find All References</span>
            <span className="text-[9px] opacity-65 font-mono">Shift+Alt+F12</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.goToImplementation'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Find All Implementations</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.showCallHierarchy'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Show Call Hierarchy</span>
            <span className="text-[9px] opacity-65 font-mono">Shift+Alt+H</span>
          </button>

          <div className="h-[1px] bg-black/25 my-1" />

          {/* Group 3: Chat Integration */}
          <button onClick={() => { handleAddFileToChat(); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Add File to Chat</span>
          </button>
          
          <button onClick={() => { handleOpenInlineChat(); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Open Inline Chat</span>
            <span className="text-[9px] opacity-65 font-mono">Ctrl+I</span>
          </button>
          
          <button onClick={() => { handleExplain(); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Explain</span>
          </button>
          
          <button onClick={() => { handleReview(); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Review</span>
          </button>

          {activeTab?.language === 'python' && (
            <button onClick={() => { handleRunJupyter(); setContextMenu({ visible: false }) }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-400 hover:text-black hover:font-bold rounded-xl transition-all border border-dashed border-emerald-400/30 hover:border-solid hover:border-black mt-1.5"
            >
              <span>Run in Jupyter</span>
              <span className="text-[9px] opacity-65 font-mono">Shift+Enter</span>
            </button>
          )}

          <div className="h-[1px] bg-black/25 my-1" />

          {/* Group 4: Code Modification */}
          <button onClick={() => { triggerMonacoAction('editor.action.rename'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Rename Symbol</span>
            <span className="text-[9px] opacity-65 font-mono">F2</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.changeAll'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Change All Occurrences</span>
            <span className="text-[9px] opacity-65 font-mono">Ctrl+F2</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.formatDocument'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Format Document</span>
            <span className="text-[9px] opacity-65 font-mono">Shift+Alt+F</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.refactor'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Refactor...</span>
            <span className="text-[9px] opacity-65 font-mono">Ctrl+Shift+R</span>
          </button>
          
          <button onClick={() => { triggerMonacoAction('editor.action.sourceAction'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Source Action...</span>
            <span className="text-[9px] opacity-65 font-mono">Alt+Insert</span>
          </button>

          <div className="h-[1px] bg-black/25 my-1" />

          {/* Group 5: Clipboard */}
          <button onClick={() => { handleCut(); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Cut</span>
            <span className="text-[9px] opacity-65 font-mono">Ctrl+X</span>
          </button>
          
          <button onClick={() => { handleCopy(); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Copy</span>
            <span className="text-[9px] opacity-65 font-mono">Ctrl+C</span>
          </button>
          
          <button onClick={() => { handlePaste(); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Paste</span>
            <span className="text-[9px] opacity-65 font-mono">Ctrl+V</span>
          </button>

          <div className="h-[1px] bg-black/25 my-1" />

          {/* Group 6: System */}
          <button onClick={() => { triggerMonacoAction('editor.action.quickCommand'); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
          >
            <span>Command Palette...</span>
            <span className="text-[9px] opacity-65 font-mono">Ctrl+Shift+P</span>
          </button>

          <div className="h-[1px] bg-black/25 my-1" />

          {/* CodeSnap */}
          <button onClick={() => { handleCodeSnap(); setContextMenu({ visible: false }) }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-aeres-violet hover:bg-aeres-violet hover:text-black hover:font-black rounded-xl transition-all border border-dashed border-aeres-violet/40 hover:border-solid hover:border-black"
          >
            <span className="flex items-center gap-1.5">CodeSnap <Camera size={14} /></span>
          </button>
        </div>,
        document.body
      )}

      {/* CodeSnap Modal */}
      {codeSnapData.visible && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="relative max-w-2xl w-full bg-[#13141f] border-2 border-black rounded-3xl overflow-hidden shadow-[2px_2px_0px_#000] p-6 animate-scale-up">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-aeres-violet mb-4 flex items-center gap-2">
              <Camera size={18} /> Aeres CodeSnap
            </h3>
            
            {/* The Snap Card with Vibrant Gradient Backdrop */}
            <div id="codesnap-card" className="relative p-6 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 shadow-2xl flex flex-col min-h-[220px]">
              {/* Frosted Code Shell */}
              <div className="rounded-xl bg-slate-950/85 border border-white/10 p-4 shadow-xl backdrop-blur-md flex-1">
                {/* Header window control dots */}
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                  <span className="text-[10px] text-slate-400 font-mono ml-2">{codeSnapData.fileName}</span>
                </div>
                {/* Code Body */}
                <pre className="text-xs text-white leading-relaxed font-mono whitespace-pre overflow-x-auto max-h-72 p-1">
                  {codeSnapData.code}
                </pre>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(codeSnapData.code); const store = useStore.getState(); store.appendOutputLog('success', "Code copied to clipboard!"); store.setActiveSidebarTab('output'); }}
                className="px-4 py-1.5 bg-aeres-violet text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] hover:scale-105 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 justify-center"><Clipboard size={14} /> Copy Code</div>
              </button>
              <button
                onClick={() => setCodeSnapData({ visible: false, code: '', fileName: '' })}
                className="px-4 py-1.5 bg-red-500 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] hover:scale-105 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
