import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let _tabIdCounter = 0

export const useStore = create(
  persist(
    (set, get) => ({
      // ── AUTH ───────────────────────────────────────────
      authStatus: { authenticated: false, email: null },
      setAuthStatus: (s) => set({ authStatus: s }),

      // ── BACKEND ───────────────────────────────────────
      backendUrl: null,
      backendError: null,
      setBackendUrl: (url) => set({ backendUrl: url, backendError: null }),
      setBackendError: (err) => set({ backendError: err }),

      // ── WORKSPACE ─────────────────────────────────────
      rootPath: null,
      fileTree: null,
      setRootPath: (p) => set({ rootPath: p }),
      setFileTree: (t) => set({ fileTree: t }),

      // ── TABS ──────────────────────────────────────────
      tabs: [],
      activeTabId: null,
      recentlyClosedTabs: [],

      openTab: (file) => {
        const state = get()
        const existing = state.tabs.find((t) => t.path === file.path)
        if (existing) {
          // Update the line number even for existing tabs
          const updatedTabs = state.tabs.map(t => 
            t.id === existing.id ? { ...t, line: file.line || 1 } : t
          )
          set({ tabs: updatedTabs, activeTabId: existing.id })
          return existing.id
        }
        const id = `tab_${++_tabIdCounter}`
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

      // ── EDITOR ────────────────────────────────────────
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

      // ── MODERNIZE ─────────────────────────────────────
      modernizeState: 'idle', // idle | scanning | scraping | streaming | done | error
      originalCode: '',
      fixedCode: '',
      activeFlag: null,
      sourceUrl: '',
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

      // ── TERMINAL ──────────────────────────────────────
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

      // ── DEBUGGER ──────────────────────────────────────
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

      // ── GIT ───────────────────────────────────────────
      gitStatus: { branch: 'main', files: [], ahead: 0, behind: 0 },
      gitPanelOpen: false,
      gitPanelTab: 'changes', // changes | history | branches
      setGitStatus: (gs) => set({ gitStatus: gs }),
      setGitPanelOpen: (open) => set({ gitPanelOpen: open }),
      setGitPanelTab: (tab) => set({ gitPanelTab: tab }),

      // ── DIAGNOSTICS ───────────────────────────────────
      diagnostics: {},
      setDiagnostics: (filePath, markers) =>
        set((s) => ({
          diagnostics: { ...s.diagnostics, [filePath]: markers },
        })),

      // ── LAYOUT ────────────────────────────────────────
      sidebarWidth: 260,
      rightPanelOpen: true,
      rightPanelWidth: 340,
      activeSidebarTab: 'files', // files | search | git | debug
      activeRightTab: 'rag', // rag | problems
      theme: 'dark',

      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
      setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
      setActiveRightTab: (tab) => set({ activeRightTab: tab }),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      // ── SESSIONS ──────────────────────────────────────
      currentSessionName: null,
      setCurrentSessionName: (name) => set({ currentSessionName: name }),

      // ── CHAT ──────────────────────────────────────────
      chatMessages: [],
      appendChatMessage: (msg) =>
        set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
      clearChat: () => set({ chatMessages: [] }),
    }),
    {
      name: 'aether-ide-state',
      partialize: (state) => ({
        editorSettings: state.editorSettings,
        theme: state.theme,
        sidebarWidth: state.sidebarWidth,
        rightPanelWidth: state.rightPanelWidth,
        terminalPanelHeight: state.terminalPanelHeight,
      }),
    }
  )
)
