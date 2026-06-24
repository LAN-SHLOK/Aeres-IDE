import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let _tabIdCounter = 0

export const useStore = create(
  persist(
    (set, get) => ({
      // AUTH
      authStatus: { authenticated: false, email: null },
      setAuthStatus: (s) => set({ authStatus: s }),

      // BACKEND
      backendUrl: null,
      backendError: null,
      setBackendUrl: (url) => set({ backendUrl: url, backendError: null }),
      setBackendError: (err) => set({ backendError: err }),

      // WORKSPACE
      rootPath: null,
      fileTree: null,
      comparePath: null,
      explorerOpenPaths: [], // array of paths to keep expanded
      setRootPath: (p) => set({ rootPath: p }),
      setFileTree: (t) => set({ fileTree: t }),
      setComparePath: (p) => set({ comparePath: p }),
      toggleExplorerOpenPath: (path, forceOpen) => set((s) => {
        const next = new Set(s.explorerOpenPaths)
        if (forceOpen) { next.add(path) } else if (next.has(path)) { next.delete(path) } else { next.add(path) }
        return { explorerOpenPaths: Array.from(next) }
      }),

      // OVERLAYS
      quickOpenOpen: false,
      setQuickOpenOpen: (open) => set({ quickOpenOpen: open }),
      paletteOpen: false,
      setPaletteOpen: (open) => set({ paletteOpen: open }),
      keybindingsOpen: false,
      setKeybindingsOpen: (open) => set({ keybindingsOpen: open }),

      // TABS
      tabs: [],
      activeTabId: null,
      recentlyClosedTabs: [],
      cursorLine: 1,
      cursorColumn: 1,
      selectedCount: 0,
      selectedLinesCount: 0,

      openTab: (file) => {
        const state = get()
        const existing = state.tabs.find((t) => t.path === file.path)
        if (existing) {
          // Update the line number even for existing tabs
          const updatedTabs = state.tabs.map(t => 
            t.id === existing.id ? { ...t, line: file.line || 1, highlightLines: file.highlightLines } : t
          )
          set({ tabs: updatedTabs, activeTabId: existing.id })
          return existing.id
        }
        const id = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        const tab = { id, ...file, isDirty: false, isPinned: false, line: file.line || 1 }
        set({ tabs: [...state.tabs, tab], activeTabId: id })
        return id
      },

      closeTab: (id) => {
        const state = get()
        const tab = state.tabs.find((t) => t.id === id)
        const remaining = state.tabs.filter((t) => t.id !== id)
        const closed = tab
          ? [tab, ...state.recentlyClosedTabs].slice(0, 10)
          : state.recentlyClosedTabs
        let nextActive = state.activeTabId
        if (state.activeTabId === id) {
          nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null
        }
        set({ tabs: remaining, activeTabId: nextActive, recentlyClosedTabs: closed })
      },

      closeAllTabs: () => {
        const state = get()
        const pinned = state.tabs.filter((t) => t.isPinned)
        const unpinned = state.tabs.filter((t) => !t.isPinned)
        const closed = [...unpinned, ...state.recentlyClosedTabs].slice(0, 10)
        set({ tabs: pinned, activeTabId: pinned.length > 0 ? pinned[0].id : null, recentlyClosedTabs: closed })
      },

      closeOtherTabs: () => {
        const state = get()
        const active = state.tabs.find(t => t.id === state.activeTabId)
        if (active) {
          const keepTabs = state.tabs.filter((t) => t.isPinned || t.id === active.id)
          const toClose = state.tabs.filter((t) => !t.isPinned && t.id !== active.id)
          const closed = [...toClose, ...state.recentlyClosedTabs].slice(0, 10)
          set({ tabs: keepTabs, recentlyClosedTabs: closed })
        }
      },

      setTabDirty: (id, dirty) =>
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, isDirty: dirty } : t)),
        })),

      setTabContent: (id, content) =>
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, content } : t)),
        })),

      pinTab: (id) =>
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, isPinned: !t.isPinned } : t)),
        })),

      reopenLastTab: () => {
        const state = get()
        if (state.recentlyClosedTabs.length === 0) return
        const [tab, ...rest] = state.recentlyClosedTabs
        set({
          tabs: [...state.tabs, { ...tab, isDirty: false }],
          activeTabId: tab.id,
          recentlyClosedTabs: rest,
        })
      },

      // EDITOR
      editorSettings: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        lineHeight: 1.6,
        tabSize: 2,
        useSpaces: true,
        wordWrap: 'off',
        minimap: true,
      },
      setEditorSetting: (key, val) =>
        set((s) => ({
          editorSettings: { ...s.editorSettings, [key]: val },
        })),

      // MODERNIZE
      modernizeState: 'idle', // idle | scanning | scraping | streaming | done | error
      originalCode: '',
      fixedCode: '',
      activeFlag: null,
      sourceUrl: '',
      batchModernizeState: null, // { depName, files: [{ path, originalCode, fixedCode, status: 'pending'|'modernizing'|'review'|'accepted'|'rejected'|'error' }], currentIndex: 0 }
      
      setModernizeState: (st) => set({ modernizeState: st }),
      appendFixedCode: (chunk) => set((s) => ({ fixedCode: s.fixedCode + chunk })),
      resetModernize: () =>
        set({
          modernizeState: 'idle',
          originalCode: '',
          fixedCode: '',
          activeFlag: null,
          sourceUrl: '',
        }),
      setBatchModernizeState: (state) => set({ batchModernizeState: state }),
      setBatchModernizeFileStatus: (index, status, data = {}) => set((s) => {
        if (!s.batchModernizeState) return s
        const files = [...s.batchModernizeState.files]
        if (files[index]) {
          files[index] = { ...files[index], status, ...data }
        }
        return { batchModernizeState: { ...s.batchModernizeState, files } }
      }),
      cancelBatchModernize: () => set({ batchModernizeState: null, modernizeState: 'idle' }),

      // TERMINAL
      terminals: [],
      terminalPanelOpen: false,
      terminalPanelHeight: 250,
      activeTerminalId: null,

      addTerminal: (term) =>
        set((s) => ({
          terminals: [...s.terminals, term],
          activeTerminalId: term.id,
          terminalPanelOpen: true,
        })),

      removeTerminal: (id) =>
        set((s) => {
          const remaining = s.terminals.filter((t) => t.id !== id)
          return {
            terminals: remaining,
            activeTerminalId:
              s.activeTerminalId === id
                ? remaining.length > 0
                  ? remaining[remaining.length - 1].id
                  : null
                : s.activeTerminalId,
          }
        }),

      setTerminalPanelOpen: (open) => set({ terminalPanelOpen: open }),
      setTerminalPanelHeight: (h) => set({ terminalPanelHeight: h }),
      setActiveTerminalId: (id) => set({ activeTerminalId: id }),
      
      outputLog: [],
      appendOutputLog: (type, msg) => set((s) => ({
        outputLog: [...s.outputLog, { id: Date.now() + Math.random(), type, msg, time: new Date().toLocaleTimeString() }].slice(-500)
      })),
      clearOutputLog: () => set({ outputLog: [] }),

      // DEBUGGER
      debugSession: null,
      debugState: 'idle', // idle | running | paused | stopped
      breakpoints: {},
      callStack: [],
      variables: { locals: [], watch: [] },

      setDebugSession: (s) => set({ debugSession: s }),
      setDebugState: (st) => set({ debugState: st }),
      toggleBreakpoint: (filePath, line) =>
        set((s) => {
          const bps = { ...s.breakpoints }
          const fileBps = bps[filePath] || []
          const existing = fileBps.findIndex((b) => b.line === line)
          if (existing >= 0) {
            bps[filePath] = fileBps.filter((_, i) => i !== existing)
          } else {
            bps[filePath] = [...fileBps, { line, condition: '', enabled: true }]
          }
          return { breakpoints: bps }
        }),
      setCallStack: (cs) => set({ callStack: cs }),
      setVariables: (v) => set({ variables: v }),

      // GIT
      gitStatus: { branch: 'main', files: [], ahead: 0, behind: 0 },
      gitTask: null,
      gitPanelOpen: false,
      gitPanelTab: 'changes', // changes | history | branches
      setGitStatus: (gs) => set({ gitStatus: gs }),
      setGitTask: (task) => set({ gitTask: task }),
      setGitPanelOpen: (open) => set({ gitPanelOpen: open }),
      setGitPanelTab: (tab) => set({ gitPanelTab: tab }),
      showBlame: false,
      setShowBlame: (val) => set({ showBlame: val }),
      showTemporal: true,
      setShowTemporal: (val) => set({ showTemporal: val }),

      // CAUSAL MAP
      causalTarget: null,
      setCausalTarget: (target) => set((s) => ({ 
        causalTarget: target,
        rightPanelOpen: !!target,
        activeRightTab: target ? 'causemap' : s.activeRightTab
      })),

      // DIAGNOSTICS
      diagnostics: {},
      setDiagnostics: (filePath, markers) =>
        set((s) => ({
          diagnostics: { ...s.diagnostics, [filePath]: markers },
        })),
      lspStatus: {},
      setLspStatus: (lang, status) =>
        set((s) => ({
          lspStatus: { ...s.lspStatus, [lang]: status },
        })),
      mutationResults: {},
      setMutationResults: (filePath, results) =>
        set((s) => ({
          mutationResults: { ...s.mutationResults, [filePath]: results },
        })),
      showMutations: true,
      setShowMutations: (val) => set({ showMutations: val }),

      // HEALTH DASHBOARD
      healthScore: null,
      healthIssues: [],
      isScanningHealth: false,
      setHealthData: (score, issues) => set({ healthScore: score, healthIssues: issues }),
      setIsScanningHealth: (scanning) => set({ isScanningHealth: scanning }),

      // LAYOUT
      sidebarWidth: 260,
      rightPanelOpen: true,
      rightPanelWidth: 340,
      activeSidebarTab: 'files', // files | search | git | debug
      activeRightTab: 'chat', // chat | problems
      theme: 'cutie-dark',
      fileIconTheme: 'material-icons',
      productIconTheme: 'default',
      installedExtensions: ['aeres-ai-core'], // Aeres AI Core is installed by default
      disabledExtensions: [],

      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
      setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
      setActiveRightTab: (tab) => set({ activeRightTab: tab }),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      
      zenMode: false,
      toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode, rightPanelOpen: s.zenMode, activeSidebarTab: s.zenMode ? 'files' : null })),
      typewriterMode: false,
      toggleTypewriterMode: () => set((s) => ({ typewriterMode: !s.typewriterMode })),

      toggleTheme: () => set((s) => ({ theme: s.theme.includes('light') ? 'cutie-dark' : 'cutie-light' })),
      setTheme: (theme) => set({ theme }),
      setFileIconTheme: (theme) => set({ fileIconTheme: theme }),
      setProductIconTheme: (theme) => set({ productIconTheme: theme }),
      serverUrl: null,
      setServerUrl: (url) => set({ serverUrl: url }),
      installExtension: (id) => set((s) => {
        if (s.installedExtensions.includes(id)) return {}
        import('./utils/extensionHost.js').then(({ extensionHost }) => {
          extensionHost.loadExtension(id)
        })
        return { installedExtensions: [...s.installedExtensions, id] }
      }),
      uninstallExtension: (id) => set((s) => {
        import('./utils/extensionHost.js').then(({ extensionHost }) => {
          extensionHost.unloadExtension(id)
        })
        return {
          installedExtensions: s.installedExtensions.filter(x => x !== id),
          disabledExtensions: s.disabledExtensions.filter(x => x !== id)
        }
      }),
      toggleDisableExtension: (id) => set((s) => {
        const isCurrentlyDisabled = s.disabledExtensions.includes(id)
        import('./utils/extensionHost.js').then(({ extensionHost }) => {
          if (isCurrentlyDisabled) {
            extensionHost.loadExtension(id)
          } else {
            extensionHost.unloadExtension(id)
          }
        })
        return {
          disabledExtensions: isCurrentlyDisabled
            ? s.disabledExtensions.filter(x => x !== id)
            : [...s.disabledExtensions, id]
        }
      }),

      // SESSIONS
      currentSessionName: 'No Session',
      setCurrentSessionName: (name) => set({ currentSessionName: name }),

      saveSession: async (name) => {
        if (!window.electron || !window.electron.sessions) {
          console.warn('[Store] sessions API not available in this environment')
          return { error: 'Sessions not available' }
        }
        const state = get()
        const serializableState = {
          tabs: state.tabs || [],
          activeTabId: state.activeTabId,
          rootPath: state.rootPath,
          sidebarWidth: state.sidebarWidth || 260,
          rightPanelWidth: state.rightPanelWidth || 340,
          terminalPanelHeight: state.terminalPanelHeight || 250,
          activeSidebarTab: state.activeSidebarTab || 'files',
          activeRightTab: state.activeRightTab || 'chat',
          gitStatus: { branch: state.gitStatus?.branch },
          chatMessages: state.chatMessages || []
        }
        const res = await window.electron.sessions.save(name, serializableState)
        if (res && res.id) set({ currentSessionName: name })
        return res
      },

      restoreSession: async (id) => {
        if (!window.electron || !window.electron.sessions) {
          console.warn('[Store] sessions API not available in this environment')
          return
        }
        const state = await window.electron.sessions.load({ id })
        if (!state) return
        
        set({
          rootPath: state.rootPath || get().rootPath,
          tabs: state.tabs || [],
          activeTabId: state.activeTabId,
          sidebarWidth: state.sidebarWidth || 260,
          rightPanelWidth: state.rightPanelWidth || 340,
          terminalPanelHeight: state.terminalPanelHeight || 250,
          activeSidebarTab: state.activeSidebarTab || 'files',
          activeRightTab: state.activeRightTab || 'chat',
          chatMessages: state.chatMessages || [],
          currentSessionName: state.name || 'Restored Session'
        })
      },

      // CHAT
      chatMessages: [],
      appendChatMessage: (msg) =>
        set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
      cycleTabs: (direction) => {
        const state = get()
        if (state.tabs.length <= 1) return
        const currentIndex = state.tabs.findIndex((t) => t.id === state.activeTabId)
        let nextIndex = (currentIndex + direction) % state.tabs.length
        if (nextIndex < 0) nextIndex = state.tabs.length - 1
        set({ activeTabId: state.tabs[nextIndex].id })
      },

      clearChat: () => set({ chatMessages: [], agentMessages: [], agentSteps: [], pendingConfirm: null, agentRunning: false }),

      // AGENT
      agentMode: 'chat',
      agentRunning: false,
      agentSteps: [],
      agentMessages: [],
      pendingConfirm: null,

      setAgentMode: (mode) => set({ agentMode: mode }),
      setAgentRunning: (running) => set({ agentRunning: running }),
      clearAgentSteps: () => set({ agentSteps: [] }),
      setPendingConfirm: (p) => set({ pendingConfirm: p }),
      
      appendAgentStep: (step) => set((s) => {
        if (step.type === 'done' || step.type === 'error') {
          return { agentRunning: false, agentSteps: [...s.agentSteps, step] }
        }
        if (step.type === 'needs_confirm') {
          return { pendingConfirm: step, agentSteps: [...s.agentSteps, step] }
        }
        if (step.type === 'tool_result') {
          const newSteps = s.agentSteps.map(st => 
            st.id === step.id
              ? { ...st, status: 'done', result: step.result } 
              : st
          )
          // If the step wasn't found in the map (e.g. results arriving after a refresh), still append it?
          // Usually we want to see the result.
          const existing = s.agentSteps.find(st => st.id === step.id)
          if (!existing) {
            return { agentSteps: [...s.agentSteps, step] }
          }
          return { agentSteps: newSteps }
        }
        return { agentSteps: [...s.agentSteps, step] }
      }),
      
      appendAgentMessage: (msg) => set((s) => ({ agentMessages: [...s.agentMessages, msg] })),
      setAgentMessages: (msgs) => set({ agentMessages: msgs }),

      // ENVIRONMENTS
      activeEnvironment: null,
      availableEnvironments: [],
      envSelectorOpen: false,
      setEnvSelectorOpen: (open) => set({ envSelectorOpen: open }),
      setActiveEnvironment: (env) => set({ activeEnvironment: env }),
      setAvailableEnvironments: (envs) => set({ availableEnvironments: envs }),
      refreshEnvironments: async () => {
        const state = get()
        if (state.rootPath && window.electron && window.electron.env) {
          try {
            const envs = await window.electron.env.scan(state.rootPath)
            set({ availableEnvironments: envs })
            // Auto-select first non-system environment if none selected
            if (!state.activeEnvironment && envs.length > 1) {
              set({ activeEnvironment: envs[1] })
            } else if (!state.activeEnvironment && envs.length === 1) {
              set({ activeEnvironment: envs[0] })
            }
          } catch (err) {
            console.error('[Store] Failed to scan environments:', err)
          }
        }
      },

    }),
    {
      name: 'aeres-ide-state',
      partialize: (state) => ({
        editorSettings: state.editorSettings,
        theme: state.theme,
        fileIconTheme: state.fileIconTheme,
        productIconTheme: state.productIconTheme,
        sidebarWidth: state.sidebarWidth,
        rightPanelWidth: state.rightPanelWidth,
        terminalPanelHeight: state.terminalPanelHeight,
        installedExtensions: state.installedExtensions,
      }),
    }
  )
)
