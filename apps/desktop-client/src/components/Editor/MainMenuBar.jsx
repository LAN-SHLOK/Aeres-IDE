import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store.js'
import { openFolderAndResetTerminals } from '../../utils/workspaceActions.js'

export default function MainMenuBar() {
  const [activeMenu, setActiveMenu] = useState(null)
  const [activeSubmenu, setActiveSubmenu] = useState(null)
  const menuRef = useRef(null)
  const rootPath = useStore((s) => s.rootPath)
  const activeTabId = useStore((s) => s.activeTabId)

  const openLink = (url) => {
    if (window.electron?.fs?.openExternal) {
      window.electron.fs.openExternal(url)
    }
  }

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'New Text File', shortcut: 'Ctrl+N', action: () => {
          const store = useStore.getState()
          store.openTab({ name: 'Untitled', path: 'untitled_' + Date.now() + '.txt', content: '', language: 'plaintext' })
        } },
        { label: 'Open File...', action: async () => {
          const e = window.electron
          if (!e) return
          const result = await e.fs.openFile()
          if (!result) return
          const filePath = Array.isArray(result) ? result[0] : result
          if (!filePath) return
          const name = filePath.split(/[/\\]/).pop()
          try {
            const content = await e.fs.readFile(filePath)
            useStore.getState().openTab({ name, path: filePath, content, language: name.split('.').pop() || 'plaintext' })
          } catch (err) {
            console.error('[MainMenuBar] Failed to read file:', err)
          }
        } },
        { label: 'Open Folder...', shortcut: 'Ctrl+O', action: async () => {
          await openFolderAndResetTerminals()
        }},
        { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: () => {
          window.electron?.window?.newWindow()
        }},
        { type: 'separator' },
        { label: 'Save', shortcut: 'Ctrl+S', action: () => {
          window.dispatchEvent(new CustomEvent('aeres:editor-save'))
        } },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => {
          window.dispatchEvent(new CustomEvent('aeres:editor-save-as'))
        } },
        { type: 'separator' },
        { label: 'Close Tab', shortcut: 'Ctrl+W', action: () => useStore.getState().closeTab(activeTabId) },
        { label: 'Reopen Closed Tab', shortcut: 'Ctrl+Shift+T', action: () => useStore.getState().reopenLastTab() },
        { type: 'separator' },
        {
          label: 'Preferences',
          submenu: [
            { label: 'Settings', shortcut: 'Ctrl+,', action: () => document.dispatchEvent(new CustomEvent('aeres:open-settings')) },
            {
              label: 'Color Theme',
              shortcut: 'Ctrl+K Ctrl+T',
              action: () => {
                document.dispatchEvent(new CustomEvent('aeres:open-settings', { detail: { category: 'themes', tab: 'color' } }))
              }
            },
            {
              label: 'File Icon Theme',
              action: () => {
                document.dispatchEvent(new CustomEvent('aeres:open-settings', { detail: { category: 'themes', tab: 'fileIcons' } }))
              }
            },
            {
              label: 'Product Icon Theme',
              action: () => {
                document.dispatchEvent(new CustomEvent('aeres:open-settings', { detail: { category: 'themes', tab: 'productIcons' } }))
              }
            },
            { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: () => document.dispatchEvent(new CustomEvent('aeres:open-shortcuts')) },
            { label: 'Configure User Snippets', action: () => document.dispatchEvent(new CustomEvent('aeres:open-snippets')) },
            { label: 'User Tasks', action: () => useStore.setState({ terminalPanelOpen: true }) }
          ]
        },
        { type: 'separator' },
        { label: 'Exit', action: () => {
          if (window.electron?.window?.close) {
            window.electron.window.close()
          } else {
            window.close()
          }
        }},
      ]
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-undo')) },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-redo')) },
        { type: 'separator' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-cut')) },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-copy')) },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-paste')) },
        { type: 'separator' },
        { label: 'Toggle Code Folding', shortcut: 'Ctrl+Shift+[', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-toggle-folding')) },
      ]
    },
    {
      label: 'Selection',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-select-all')) },
        { label: 'Next Match', shortcut: 'Ctrl+D', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-next-match')) },
        { label: 'Add Multi-Cursor', shortcut: 'Alt+Click', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-add-multicursor')) },
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => useStore.setState({ paletteOpen: true }) },
        { label: 'Open View...', action: () => useStore.setState({ paletteOpen: true }) },
        { type: 'separator' },
        {
          label: 'Appearance',
          submenu: [
            { label: 'Toggle Full Screen', shortcut: 'F11', action: () => {
              if (window.electron?.window?.toggleFullScreen) {
                window.electron.window.toggleFullScreen()
              }
            } },
            { label: 'Toggle Zen Mode', action: () => {
              useStore.getState().toggleZenMode()
            } },
            { label: 'Toggle Centered Layout', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-centered-layout')) }
          ]
        },
        {
          label: 'Editor Layout',
          submenu: [
            { label: 'Single', action: () => {} },
            { label: 'Two Columns', action: () => {} },
            { label: 'Three Columns', action: () => {} },
            { label: 'Grid', action: () => {} }
          ]
        },
        { type: 'separator' },
        { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => useStore.setState({ activeSidebarTab: 'files' }) },
        { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => useStore.setState({ activeSidebarTab: 'search' }) },
        { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => useStore.setState({ activeSidebarTab: 'git' }) },
        { label: 'Run', shortcut: 'Ctrl+Shift+D', action: () => useStore.setState({ activeSidebarTab: 'debug' }) },
        { label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: () => useStore.setState({ activeSidebarTab: 'extensions' }) },
        { label: 'Testing', action: () => useStore.setState({ activeSidebarTab: 'testing' }) },
        { type: 'separator' },
        { label: 'Chat', shortcut: 'Ctrl+Alt+I', action: () => useStore.setState({ rightPanelOpen: true, activeRightTab: 'chat' }) },
        { label: 'Browser', shortcut: 'Ctrl+Alt+/', action: () => {
          const url = window.prompt('Enter localhost URL to open in browser:', 'http://localhost:3000')
          if (url && window.electron?.fs?.openExternal) {
            window.electron.fs.openExternal(url)
          }
        } },
        { type: 'separator' },
        { label: 'Problems', shortcut: 'Ctrl+Shift+M', action: () => {
          useStore.setState({ terminalPanelOpen: true })
          setTimeout(() => window.dispatchEvent(new CustomEvent('aeres:select-terminal-tab', { detail: 'problems' })), 50)
        } },
        { label: 'Output', shortcut: 'Ctrl+Shift+U', action: () => {
          useStore.setState({ terminalPanelOpen: true })
          setTimeout(() => window.dispatchEvent(new CustomEvent('aeres:select-terminal-tab', { detail: 'output' })), 50)
        } },
        { label: 'Debug Console', shortcut: 'Ctrl+Shift+Y', action: () => {
          useStore.setState({ terminalPanelOpen: true })
          setTimeout(() => window.dispatchEvent(new CustomEvent('aeres:select-terminal-tab', { detail: 'debug' })), 50)
        } },
        { label: 'Terminal', shortcut: 'Ctrl+`', action: () => {
          useStore.setState({ terminalPanelOpen: true })
          setTimeout(() => window.dispatchEvent(new CustomEvent('aeres:select-terminal-tab', { detail: 'terminal' })), 50)
        } },
        { type: 'separator' },
        { label: 'Word Wrap', shortcut: 'Alt+Z', action: () => {
          const store = useStore.getState()
          store.setEditorSetting('wordWrap', store.editorSettings.wordWrap === 'on' ? 'off' : 'on')
        } }
      ]
    },
    {
      label: 'Go',
      items: [
        { label: 'Back', shortcut: 'Alt+LeftArrow', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-back')) },
        { label: 'Forward', shortcut: 'Alt+RightArrow', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-forward')) },
        { label: 'Last Edit Location', shortcut: 'Ctrl+K Ctrl+Q', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-last-edit')) },
        { type: 'separator' },
        {
          label: 'Switch Editor',
          submenu: [
            { label: 'Next Editor', shortcut: 'Ctrl+PgDn', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-next')) },
            { label: 'Previous Editor', shortcut: 'Ctrl+PgUp', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-prev')) }
          ]
        },
        {
          label: 'Switch Group',
          submenu: [
            { label: 'Focus Left Group', shortcut: 'Ctrl+1', action: () => {} },
            { label: 'Focus Side Group', shortcut: 'Ctrl+2', action: () => {} }
          ]
        },
        { type: 'separator' },
        { label: 'Go to File...', shortcut: 'Ctrl+P', action: () => useStore.setState({ quickOpenOpen: true }) },
        { label: 'Go to Symbol in Workspace...', shortcut: 'Ctrl+T', action: () => useStore.setState({ paletteOpen: true }) },
        { type: 'separator' },
        { label: 'Go to Symbol in Editor...', shortcut: 'Ctrl+Shift+O', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-symbols')) },
        { label: 'Go to Definition', shortcut: 'F12', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-goto-definition')) },
        { label: 'Go to Declaration', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-goto-declaration')) },
        { label: 'Go to Type Definition', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-goto-type-definition')) },
        { label: 'Go to Implementations', shortcut: 'Ctrl+F12', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-goto-implementation')) },
        { label: 'Go to References', shortcut: 'Shift+F12', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-find-references')) },
        { type: 'separator' },
        { label: 'Go to Line/Column...', shortcut: 'Ctrl+G', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-goto-line')) },
        { label: 'Go to Bracket', shortcut: 'Ctrl+Shift+\\', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-goto-bracket')) },
        { type: 'separator' },
        { label: 'Next Problem', shortcut: 'F8', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-next-problem')) },
        { label: 'Previous Problem', shortcut: 'Shift+F8', action: () => window.dispatchEvent(new CustomEvent('aeres:editor-prev-problem')) },
        { type: 'separator' },
        { label: 'Next Change', shortcut: 'Alt+F3', action: () => {} },
        { label: 'Previous Change', shortcut: 'Shift+F3', action: () => {} }
      ]
    },
    {
      label: 'Run',
      items: [
        { label: 'Start Debugging', shortcut: 'F5', action: () => window.dispatchEvent(new CustomEvent('aeres:debug-start')) },
        { label: 'Stop Debugging', shortcut: 'Shift+F5', action: () => window.dispatchEvent(new CustomEvent('aeres:debug-stop')) },
        { label: 'Step Over', shortcut: 'F10', action: () => window.dispatchEvent(new CustomEvent('aeres:debug-step-over')) },
        { label: 'Step Into', shortcut: 'F11', action: () => window.dispatchEvent(new CustomEvent('aeres:debug-step-into')) },
        { label: 'Step Out', shortcut: 'Shift+F11', action: () => window.dispatchEvent(new CustomEvent('aeres:debug-step-out')) },
      ]
    },
    {
      label: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: () => window.dispatchEvent(new CustomEvent('aeres:new-terminal')) },
        { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5', action: () => {} },
        { label: 'New Terminal Window', shortcut: 'Ctrl+Shift+Alt+`', action: () => {} },
        { type: 'separator' },
        { label: 'Run Task...', action: () => {} },
        { label: 'Run Build Task...', shortcut: 'Ctrl+Shift+B', action: () => {} },
        { label: 'Run Active File', action: () => window.dispatchEvent(new CustomEvent('aeres:run-active-file')) },
        { label: 'Run Selected Text', action: () => {} },
        { type: 'separator' },
        { label: 'Show Running Tasks...', action: () => {} },
        { label: 'Restart Running Task...', action: () => {} },
        { label: 'Terminate Task...', action: () => {} },
        { type: 'separator' },
        { label: 'Configure Tasks...', action: () => {} },
        { label: 'Configure Default Build Task...', action: () => {} }
      ]
    },
    {
      label: 'Aeres AI',
      items: [
        { label: 'AI Chat Panel', shortcut: 'Ctrl+Alt+C', action: () => {
          useStore.setState({ rightPanelOpen: true, activeRightTab: 'chat' })
        } },
        { label: 'AI Agent Panel', shortcut: 'Ctrl+Alt+A', action: () => {
          useStore.setState({ rightPanelOpen: true, activeRightTab: 'agent' })
        } },
        { type: 'separator' },
        { label: 'Modernize Code', shortcut: 'Ctrl+Alt+M', action: () => {
          window.dispatchEvent(new CustomEvent('aeres:modernize'))
        } },
        { label: 'Test Quality', shortcut: 'Ctrl+Alt+Q', action: () => {
          useStore.setState({ activeSidebarTab: 'testing' })
        } },
        { label: 'Problems Panel', shortcut: 'Ctrl+Alt+P', action: () => {
          useStore.setState({ terminalPanelOpen: true })
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('aeres:select-terminal-tab', { detail: 'problems' }))
          }, 50)
        } },
        { label: 'Focus Session Manager', shortcut: 'Ctrl+Alt+F', action: () => {
          useStore.setState({ rightPanelOpen: true, activeRightTab: 'focus' })
        } },
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'Welcome', action: () => {} },
        { label: 'Show All Commands', shortcut: 'Ctrl+Shift+P', action: () => useStore.setState({ paletteOpen: true }) },
        { label: 'Documentation', action: () => openLink('https://docs.aeres.ai') },
        { label: 'Editor Playground', action: () => {
          const store = useStore.getState()
          store.openTab({ name: 'Playground.js', path: 'playground_' + Date.now() + '.js', content: '// Welcome to Aeres Editor Playground!\n// Try out some code here.\n\nconsole.log("Hello, World!");\n', language: 'javascript' })
        } },
        { label: 'Open Walkthrough...', action: () => {} },
        { label: 'Show Release Notes', action: () => openLink('https://github.com/aeres/ide/releases') },
        { label: 'Get Started with Accessibility Features', action: () => openLink('https://docs.aeres.ai/accessibility') },
        { label: 'Ask @aeres', action: () => useStore.setState({ rightPanelOpen: true, activeRightTab: 'chat' }) },
        { type: 'separator' },
        { label: 'Keyboard Shortcuts Reference', shortcut: 'Ctrl+K Ctrl+R', action: () => useStore.setState({ keybindingsOpen: true }) },
        { label: 'Video Tutorials', action: () => openLink('https://youtube.com/@AeresIDE') },
        { label: 'Tips and Tricks', action: () => openLink('https://twitter.com/AeresIDE') },
        { type: 'separator' },
        { label: 'Join Us on YouTube', action: () => openLink('https://youtube.com/@AeresIDE') },
        { label: 'Search Feature Requests', action: () => openLink('https://github.com/aeres/ide/issues') },
        { label: 'Report Issue', action: () => openLink('https://github.com/aeres/ide/issues') },
        { type: 'separator' },
        { label: 'View License', action: () => openLink('https://github.com/aeres/ide/blob/main/LICENSE') },
        { label: 'Privacy Statement', action: () => openLink('https://aeres.ai/privacy') },
        { type: 'separator' },
        { label: 'Toggle Developer Tools', action: () => {
          if (window.electron?.window?.toggleDevTools) {
            window.electron.window.toggleDevTools()
          }
        } },
        { label: 'Open Process Explorer', action: () => {} },
        { type: 'separator' },
        { label: 'Check for Updates...', action: () => { const store = useStore.getState(); store.appendOutputLog('info', 'Aeres IDE is up to date!'); store.setActiveSidebarTab('output'); } },
        { type: 'separator' },
        { label: 'About Aeres IDE', action: () => { const store = useStore.getState(); store.appendOutputLog('info', 'Aeres IDE\nBuilt for the Future.'); store.setActiveSidebarTab('output'); } }
      ]
    }
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null)
        setActiveSubmenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex items-center h-8 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800/50 select-none z-40" ref={menuRef}>
      <div className="flex items-center h-full ml-2">
        {menus.map((menu) => (
          <div key={menu.label} className="relative h-full">
            <button
              className={`px-3 h-full text-[12px] text-slate-300 hover:bg-white/5 transition-colors ${activeMenu === menu.label ? 'bg-white/5' : ''}`}
              onMouseEnter={() => {
                if (activeMenu) {
                  setActiveMenu(menu.label)
                  setActiveSubmenu(null)
                }
              }}
              onClick={() => {
                setActiveMenu(activeMenu === menu.label ? null : menu.label)
                setActiveSubmenu(null)
              }}
            >
              {menu.label}
            </button>

            {activeMenu === menu.label && (
              <div className="absolute left-0 top-full z-[1000] w-64 bg-slate-900/90 backdrop-blur-lg border border-slate-700/50 py-1 shadow-2xl rounded-sm">
                {menu.items.map((item, i) => (
                  item.type === 'separator' ? (
                    <div key={i} className="my-1 border-b border-slate-800/50" />
                  ) : (
                    <button
                      key={i}
                      className="w-full flex items-center justify-between px-4 py-1.5 text-[12px] text-slate-300 hover:bg-violet-600/30 hover:text-white transition-colors group relative"
                      onMouseEnter={() => item.submenu ? setActiveSubmenu(i) : setActiveSubmenu(null)}
                      onClick={() => {
                        if (item.action) {
                          item.action()
                          setActiveMenu(null)
                          setActiveSubmenu(null)
                        }
                      }}
                    >
                      <span>{item.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 group-hover:text-white/80 opacity-60 ml-4">{item.shortcut}</span>
                        {item.submenu && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-1 opacity-60"><path d="m9 18 6-6-6-6"/></svg>
                        )}
                      </div>

                      {item.submenu && activeSubmenu === i && (
                        <div className="absolute left-full top-0 z-[1001] w-60 bg-slate-900/95 backdrop-blur-lg border border-slate-700/50 py-1 shadow-2xl rounded-sm">
                          {item.submenu.map((sub, si) => (
                            sub.type === 'separator' ? (
                              <div key={si} className="my-1 border-b border-slate-800/50" />
                            ) : (
                              <button
                                key={si}
                                className="w-full flex items-center justify-between px-4 py-1.5 text-[12px] text-slate-300 hover:bg-violet-600/30 hover:text-white transition-colors group"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (sub.action) sub.action()
                                  setActiveMenu(null)
                                  setActiveSubmenu(null)
                                }}
                              >
                                <span>{sub.label}</span>
                                <span className="text-[10px] text-slate-500 group-hover:text-white/80 opacity-60 ml-4">{sub.shortcut}</span>
                              </button>
                            )
                          ))}
                        </div>
                      )}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center pointer-events-none">
         <span className="text-[11px] text-slate-500 font-medium opacity-60 italic">
            {rootPath ? rootPath.split(/[/\\]/).pop() : 'Aeres IDE'}
         </span>
      </div>

      {/* Right-Side Action Bar: Focus Sessions */}
      <div className="flex items-center gap-2 h-full px-2">
        <button 
          onClick={() => useStore.setState({ activeRightTab: 'focus', rightPanelOpen: true })}
          className="flex items-center gap-1.5 px-3 h-6 rounded-sm border border-slate-700/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Focus Session
        </button>
      </div>
    </div>
  )
}
