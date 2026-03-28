import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
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

  // Modernize state
  const modernizeState = useStore((s) => s.modernizeState)
  const originalCode = useStore((s) => s.originalCode)
  const fixedCode = useStore((s) => s.fixedCode)
  const sourceUrl = useStore((s) => s.sourceUrl)
  const setModernizeState = useStore((s) => s.setModernizeState)
  const appendFixedCode = useStore((s) => s.appendFixedCode)
  const resetModernize = useStore((s) => s.resetModernize)

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const [localContent, setLocalContent] = useState('')
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const [editorLoaded, setEditorLoaded] = useState(false)

  useEffect(() => {
    if (activeTab) setLocalContent(activeTab.content || '')
  }, [activeTab?.id, activeTab?.content])

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
        glyphMarginClassName: 'aether-breakpoint-gutter',
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
      editor.focus()
    }, 100)
    
  }, [activeTab?.id, activeTab?.line, editorLoaded])

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
      await window.electron.debug.launch({ filePath: activeTab.path })
      return
    }

    let terminalId = store.activeTerminalId
    if (!terminalId || store.terminals.length === 0) {
      const { id } = await window.electron.terminal.create({ cwd: store.rootPath || undefined })
      addTerminal({ id, name: `Terminal ${id}` })
      terminalId = id
    }

    setTerminalPanelOpen(true)
    useStore.setState({ activeTerminalId: terminalId })
    setTimeout(() => {
      window.electron.terminal.write(terminalId, `${cmd}\r`)
    }, 500)
  }, [activeTab, localContent, addTerminal, setTerminalPanelOpen])

  useEffect(() => {
    const handler = () => handleModernize()
    document.addEventListener('aether:modernize', handler)
    return () => document.removeEventListener('aether:modernize', handler)
  }, [handleModernize])

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
      <div className="flex h-8 shrink-0 items-center gap-3 border-b border-aether-border bg-aether-surface px-3">
        <span className="truncate text-xs text-aether-muted">
          {activeTab.path.split(/[/\\]/).slice(-2).join('/')}
        </span>
        <span className="rounded bg-aether-violet/20 px-1.5 py-px text-[10px] font-medium text-aether-violet">
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
          className="flex items-center gap-1.5 rounded-md bg-aether-violet px-3 py-1 text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-40 shadow-sm"
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
        <div className="flex h-6 shrink-0 items-center gap-2 border-b border-aether-border bg-aether-surface/50 px-3">
          <span className="text-[10px] text-aether-muted">Source:</span>
          <span className="truncate text-[10px] text-aether-blue">{sourceUrl}</span>
        </div>
      )}

      {/* Editor / Diff */}
      <div className="min-h-0 flex-1">
        {showDiff ? (
          <div className="flex h-full">
            <div className="flex-1 border-r border-aether-border" style={{ background: 'rgba(239,68,68,0.03)' }}>
              <Editor
                height="100%"
                language={activeTab.language}
                value={originalCode}
                theme="vs-dark"
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: editorSettings.fontSize, fontFamily: editorSettings.fontFamily, lineHeight: editorSettings.lineHeight }}
              />
            </div>
            <div className="flex-1" style={{ background: 'rgba(34,197,94,0.03)' }}>
              <Editor
                height="100%"
                language={activeTab.language}
                value={fixedCode}
                theme="vs-dark"
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: editorSettings.fontSize, fontFamily: editorSettings.fontFamily, lineHeight: editorSettings.lineHeight }}
              />
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            language={activeTab.language}
            value={localContent}
            theme="vs-dark"
            onChange={handleChange}
            onMount={(editor, monaco) => {
              editorRef.current = editor
              monacoRef.current = monaco
              setEditorLoaded(true)
              editor.addAction({
                id: 'aether.causalBlame',
                label: 'Aether: Trace cause chain',
                contextMenuGroupId: 'aether',
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
              // --- LSP Providers ---
              const language = activeTab.language
              if (language === 'python') {
                // Ensure server is started
                window.electron.lsp.start(language, useStore.getState().rootPath)

                monaco.languages.registerCompletionItemProvider(language, {
                  triggerCharacters: ['.'],
                  provideCompletionItems: async (model, position) => {
                    const res = await window.electron.lsp.request(language, 'textDocument/completion', {
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
                    const res = await window.electron.lsp.request(language, 'textDocument/hover', {
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
                    const res = await window.electron.lsp.request(language, 'textDocument/definition', {
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
                    const res = await window.electron.lsp.request(language, 'textDocument/references', {
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
                    const res = await window.electron.lsp.request(language, 'textDocument/rename', {
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
              }

                // --- LSP Synchronization ---
                const model = editor.getModel()
                const uri = `file:///${activeTab.path.replace(/\\/g, '/')}`
                
                window.electron.lsp.notify(language, 'textDocument/didOpen', {
                  textDocument: { uri, languageId: language, version: 1, text: model.getValue() }
                })

                model.onDidChangeContent(() => {
                   window.electron.lsp.notify(language, 'textDocument/didChange', {
                     textDocument: { uri, version: Date.now() },
                     contentChanges: [{ text: model.getValue() }]
                   })
                })
              
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
            }}
          />
        )}
      </div>

      {/* Accept / Reject */}
      {showDiff && (
        <div className="flex h-10 shrink-0 items-center justify-center gap-3 border-t border-aether-border bg-aether-surface">
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
            className="flex items-center gap-1.5 rounded-md border border-aether-border bg-transparent px-4 py-1.5 text-xs font-medium text-aether-muted transition hover:border-red-500 hover:text-red-400"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
