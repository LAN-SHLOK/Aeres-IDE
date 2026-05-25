import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Editor, { DiffEditor } from '@monaco-editor/react'
import EditorTabs from './EditorTabs.jsx'
import { useStore } from '../../store.js'

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
  const editorSettings = useStore((s) => s.editorSettings)
  const theme = useStore((s) => s.theme)
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

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const [localContent, setLocalContent] = useState('')
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const [editorLoaded, setEditorLoaded] = useState(false)
  const showTemporal = useStore((s) => s.showTemporal)

  useTemporalLens(editorRef.current, activeTab?.path, showTemporal && editorLoaded)

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })
  const [codeSnapData, setCodeSnapData] = useState({ visible: false, code: '', fileName: '' })
  const [activePeekSubmenu, setActivePeekSubmenu] = useState(false)

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

  const handleOpenInlineChat = () => {
    document.dispatchEvent(new CustomEvent('aeres:focus-chat'))
  }

  const handleExplain = () => {
    if (!activeTab) return
    const sel = getSelectedTextOrAll()
    const prompt = sel.length < 200 
      ? `Explain this file: @${activeTab.name}`
      : `Explain this specific code snippet:\n\`\`\`${activeTab.language || 'javascript'}\n${sel}\n\`\`\``
    document.dispatchEvent(new CustomEvent('aeres:send-chat-prompt', { detail: prompt }))
  }

  const handleReview = () => {
    if (!activeTab) return
    const sel = getSelectedTextOrAll()
    const prompt = sel.length < 200
      ? `Identify any bugs or quality issues in @${activeTab.name}`
      : `Identify any bugs, quality issues, or refactorings in this snippet:\n\`\`\`${activeTab.language || 'javascript'}\n${sel}\n\`\`\``
    document.dispatchEvent(new CustomEvent('aeres:send-agent-prompt', { detail: prompt }))
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
    
    // Smooth scroll to the line with a small delay for layout sync
    setTimeout(() => {
      editor.revealLineInCenter(activeTab.line)
      editor.setPosition({ lineNumber: activeTab.line, column: 1 })
      useStore.setState({ cursorLine: activeTab.line, cursorColumn: 1 })
      editor.focus()
    }, 100)
    
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
    } else {
      useStore.setState({ cursorLine: 1, cursorColumn: 1 })
    }
  }, [activeTabId, editorLoaded])

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

  const handleChange = useCallback(
    (value) => {
      setLocalContent(value || '')
      if (activeTabId) {
        setTabDirty(activeTabId, true)
        setTabContent(activeTabId, value || '')
      }
    },
    [activeTabId, setTabDirty, setTabContent]
  )

  const handleModernize = useCallback(async () => {
    if (!activeTab || !window.electron) return
    const store = useStore.getState()
    if (!store.installedExtensions.includes('aeres-ai-core') || store.disabledExtensions.includes('aeres-ai-core')) {
      alert('The Aeres AI Core extension must be installed and enabled in order to run code scans or modernization optimizations. Please navigate to the Extensions sidebar panel to install or enable it.')
      return
    }
    store.setModernizeState('scanning')
    useStore.setState({ originalCode: localContent, fixedCode: '' })

    window.electron.analyze.onStream((chunk) => {
      try {
        const data = typeof chunk === 'string' ? JSON.parse(chunk) : chunk
        if (data.type === 'code_chunk') {
          useStore.getState().appendFixedCode(data.content || '')
          useStore.getState().setModernizeState('streaming')
        } else if (data.type === 'flag_found') {
          if (data.source_url) useStore.setState({ sourceUrl: data.source_url })
        } else if (data.type === 'done') {
          useStore.getState().setModernizeState('done')
          window.electron.analyze.offStream()
        } else if (data.type === 'no_deprecations') {
          useStore.getState().setModernizeState('idle')
          window.electron.analyze.offStream()
        }
      } catch {
        /* ignore parse errors */
      }
    })

    try {
      await window.electron.analyze.modernize(localContent, activeTab.path)
    } catch (err) {
      console.error('[CodeCanvas] modernize error:', err)
      useStore.getState().setModernizeState('error')
      window.electron.analyze.offStream()
    }
  }, [activeTab, localContent])

  const handleAccept = useCallback(async () => {
    if (!activeTab || !window.electron) return
    const code = useStore.getState().fixedCode
    await window.electron.fs.writeFile(activeTab.path, code)
    setTabContent(activeTabId, code)
    setTabDirty(activeTabId, false)
    setLocalContent(code)
    resetModernize()
  }, [activeTab, activeTabId, setTabContent, setTabDirty, resetModernize])

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
      } else if (activeTab.path.endsWith('.jsx')) {
        alert('JSX files cannot be run directly. Please open a project with a package.json to run this component.')
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
        const lastSlash = Math.max(activeTab.path.lastIndexOf('/'), activeTab.path.lastIndexOf('\\'))
        const fileDir = lastSlash !== -1 ? activeTab.path.substring(0, lastSlash) : '.'
        const wrapperPath = `${fileDir}/.aeres_profile_wrapper.py`
        const wrapperCode = await window.electron.temporal.wrapPython(activeTab.path)
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
      const res = await window.electron.debug.launch(activeTab.path, false)
      if (res.error) {
        alert('Launch error: ' + res.error)
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
      { name: 'aeres:debug-step-out', handler: handleDebugStepOut }
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
  }, [editorLoaded, activeTab, activeTabId, localContent, setTabDirty])

  useEffect(() => {
    const handler = () => handleModernize()
    window.addEventListener('aeres:modernize', handler)
    document.addEventListener('aeres:modernize', handler)
    return () => {
      window.removeEventListener('aeres:modernize', handler)
      document.removeEventListener('aeres:modernize', handler)
    }
  }, [handleModernize])

  // ── ESLint Extension Mock Diagnostics ──
  useEffect(() => {
    if (!activeTab) return
    const store = useStore.getState()
    if (installedExtensions.includes('eslint') && !disabledExtensions.includes('eslint')) {
      // Mock elegant linting warnings in the Problems drawer
      const markers = [
        { line: 3, message: "eslint(semi): Missing semicolon.", severity: "warning" },
        { line: 5, message: "eslint(no-unused-vars): 'data' is declared but never used.", severity: "warning" }
      ]
      store.setDiagnostics(activeTab.path, markers)
    } else {
      store.setDiagnostics(activeTab.path, [])
    }
  }, [activeTab?.path, installedExtensions.includes('eslint'), disabledExtensions.includes('eslint')])

  // ── GitLens Elite Blame Annotations ──
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeTab || !editorLoaded) return

    let decs = []
    if (installedExtensions.includes('gitlens-elite') && !disabledExtensions.includes('gitlens-elite')) {
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
  }, [activeTab?.path, installedExtensions.includes('gitlens-elite'), disabledExtensions.includes('gitlens-elite'), editorLoaded])

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
          {activeTab.path.split(/[/\\]/).slice(-2).join('/')}
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

        <div className="flex-1" />
        <button
          type="button"
          disabled={modernizeState !== 'idle'}
          onClick={handleModernize}
          title="Modernize Code: Uses Aeres AI Core to scan this file for deprecated/legacy patterns and stream modernized replacements side-by-side."
          className="flex items-center gap-1.5 rounded-md bg-aeres-violet px-3 py-1 text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-40 shadow-sm"
        >
          {modernizeState === 'idle' ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Modernize
            </>
          ) : modernizeState === 'scanning' || modernizeState === 'streaming' ? (
            <>
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              {modernizeState === 'scanning' ? 'Scanning…' : 'Streaming…'}
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Done
            </>
          )}
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
            theme={theme || 'dark'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: editorSettings.fontSize,
              fontFamily: editorSettings.fontFamily,
              lineHeight: editorSettings.lineHeight,
              renderSideBySide: true
            }}
          />
        ) : (
          <Editor
            height="100%"
            path={activeTab.path}
            language={activeTab.language}
            value={localContent}
            theme={theme || 'dark'}
            onChange={handleChange}
            onMount={(editor, monaco) => {
              editorRef.current = editor
              monacoRef.current = monaco
              setEditorLoaded(true)

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

              // Disable semantic validation to hide unresolved import errors in the browser worker and configure JSX/TSX support!
              if (monaco.languages.typescript) {
                monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                  jsx: 1, // 1 = JsxEmit.Preserve (highly standard for Monaco TSX syntax checks)
                  allowNonTsExtensions: true,
                  target: monaco.languages.typescript.ScriptTarget.Latest,
                })
                
                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: true,
                  noSyntaxValidation: false,
                })
                monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: true,
                  noSyntaxValidation: false,
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
                    alert("Live Server only supports HTML files!")
                    return
                  }
                  if (!window.electron) return
                  const { id } = await window.electron.terminal.create({ cwd: store.rootPath || undefined })
                  store.addTerminal({ id, name: `Server: ${activeTab.name}` })
                  store.setTerminalPanelOpen(true)
                  useStore.setState({ activeTerminalId: id })
                  
                  // live-server defaults to 8080. We track it in store for the "Copy Link" feature.
                  store.setServerUrl('http://127.0.0.1:8080')
                  
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
              const lspLanguages = ['python', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact']
              const language = activeTab.language

              if (lspLanguages.includes(language)) {
                const activeLang = getLspLanguage(language)
                // Ensure server is started
                window.electron.lsp.start(activeLang, useStore.getState().rootPath)

                monaco.languages.registerCompletionItemProvider(language, {
                  triggerCharacters: ['.', '/', '@'],
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

                // --- LSP Synchronization ---
                const model = editor.getModel()
                const uri = `file:///${activeTab.path.replace(/\\/g, '/')}`
                
                window.electron.lsp.notify(activeLang, 'textDocument/didOpen', {
                  textDocument: { uri, languageId: activeLang, version: 1, text: model.getValue() }
                })

                model.onDidChangeContent(() => {
                   window.electron.lsp.notify(activeLang, 'textDocument/didChange', {
                     textDocument: { uri, version: Date.now() },
                     contentChanges: [{ text: model.getValue() }]
                   })
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
              contextmenu: false,
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
          className="fixed z-[9999] w-64 rounded-2xl border-2 border-black bg-[#13141f] text-white p-1.5 shadow-[4px_4px_0px_#000000] select-none font-sans max-h-[80vh] overflow-y-auto scrollbar-hide"
          style={{ 
            left: `${Math.min(contextMenu.x, window.innerWidth - 270)}px`, 
            top: `${Math.min(contextMenu.y, Math.max(0, window.innerHeight - 500))}px` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Group 1: Navigation */}
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
          <div className="relative">
            <button 
              onMouseEnter={() => setActivePeekSubmenu(true)}
              onClick={() => setActivePeekSubmenu(!activePeekSubmenu)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-xl transition-all"
            >
              <span>Peek</span>
              <span className="text-[9px] opacity-65">▸</span>
            </button>
            {activePeekSubmenu && (
              <div className="absolute left-[95%] top-0 w-44 rounded-xl border-2 border-black bg-[#13141f] p-1 shadow-[4px_4px_0px_#000000] z-[10000]">
                <button onClick={() => { triggerMonacoAction('editor.action.peekDefinition'); setContextMenu({ visible: false }) }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-lg transition-all"
                >
                  Peek Definition
                </button>
                <button onClick={() => { triggerMonacoAction('editor.action.peekReferences'); setContextMenu({ visible: false }) }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold rounded-lg transition-all"
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
            <span>CodeSnap 📸</span>
          </button>
        </div>,
        document.body
      )}

      {/* CodeSnap Modal */}
      {codeSnapData.visible && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="relative max-w-2xl w-full bg-[#13141f] border-2 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_#000000] p-6 animate-scale-up">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-aeres-violet mb-4 flex items-center gap-2">
              📸 Aeres CodeSnap
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
                onClick={() => {
                  navigator.clipboard.writeText(codeSnapData.code)
                  alert("Code copied to clipboard!")
                }}
                className="px-4 py-1.5 bg-aeres-violet text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] hover:scale-105 transition cursor-pointer"
              >
                📋 Copy Code
              </button>
              <button
                onClick={() => setCodeSnapData({ visible: false, code: '', fileName: '' })}
                className="px-4 py-1.5 bg-red-500 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] hover:scale-105 transition cursor-pointer"
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
