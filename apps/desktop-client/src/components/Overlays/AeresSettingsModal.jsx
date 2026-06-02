import { useState } from 'react'
import { useStore } from '../../store.js'

const THEME_OPTIONS = [
  { id: 'cutie-dark', name: 'Cozy Y2K Dark' },
  { id: 'cutie-light', name: 'Sweet Y2K Light' },
  { id: 'dark', name: 'Aeres Dark' },
  { id: 'cyberpunk', name: 'Neon Cyber' },
  { id: 'nord', name: 'Nordic Frost' },
  { id: 'retro', name: 'Retro Green' },
  { id: 'solarized', name: 'Solar Abyss' },
  { id: 'amethyst', name: 'Amethyst' },
  { id: 'aeres', name: 'Aeres Cyber' }
]

const FILE_ICON_OPTIONS = [
  { id: 'material-icons', name: 'Material Icon Theme' },
  { id: 'minimal', name: 'Minimalistic Icons' },
  { id: 'vs-standard', name: 'VS Code Standard' },
  { id: 'none', name: 'None' }
]

const PRODUCT_ICON_OPTIONS = [
  { id: 'default', name: 'Aeres Default' },
  { id: 'fluent', name: 'Fluent Design' },
  { id: 'codicons', name: 'VS Codicons' },
  { id: 'pixel', name: 'Retro Pixel UI' }
]

const FONT_OPTIONS = [
  { id: "'JetBrains Mono', monospace", name: 'JetBrains Mono' },
  { id: "'Fira Code', monospace", name: 'Fira Code' },
  { id: "'Source Code Pro', monospace", name: 'Source Code Pro' },
  { id: "monospace", name: 'Default Monospace' }
]

const sidebarCategories = [
  { id: 'commonlyUsed', name: 'Commonly Used', hasSub: false },
  { id: 'themes', name: 'Themes', hasSub: false },
  { id: 'textEditor', name: 'Text Editor', hasSub: true },
  { id: 'workbench', name: 'Workbench', hasSub: true },
  { id: 'window', name: 'Window', hasSub: true },
  { id: 'chat', name: 'Chat', hasSub: true },
  { id: 'features', name: 'Features', hasSub: true },
  { id: 'application', name: 'Application', hasSub: true },
  { id: 'security', name: 'Security', hasSub: true },
  { id: 'extensions', name: 'Extensions', hasSub: true }
]

export default function AeresSettingsModal({ onClose, initialCategory, initialTab }) {
  const [activeTab, setActiveTab] = useState('user') // 'user' | 'workspace'
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'commonlyUsed')
  const [searchQuery, setSearchQuery] = useState('')

  const activeTheme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const activeFileIconTheme = useStore((s) => s.fileIconTheme)
  const setFileIconTheme = useStore((s) => s.setFileIconTheme)
  const activeProductIconTheme = useStore((s) => s.productIconTheme)
  const setProductIconTheme = useStore((s) => s.setProductIconTheme)
  
  const settings = useStore((s) => s.editorSettings)
  const setSetting = useStore((s) => s.setEditorSetting)
  
  const [themeTab, setThemeTab] = useState(initialTab || 'color') // 'color' | 'fileIcons' | 'productIcons'

  // Master definition of all settings fields
  const allSettings = [
    {
      id: 'fontSize',
      category: 'commonlyUsed',
      label: 'Editor: Font Size',
      description: 'Controls the font size in pixels.',
      type: 'number',
      value: settings.fontSize || 14,
      onChange: (val) => setSetting('fontSize', parseInt(val) || 14)
    },
    {
      id: 'formatOnSave',
      category: 'commonlyUsed',
      label: 'Editor: Format On Save',
      description: 'Format a file on save. A formatter must be available and the editor must not be shutting down. When Files: Auto Save is set to afterDelay, the file will only be formatted when saved explicitly.',
      type: 'checkbox',
      value: settings.formatOnSave || false,
      onChange: (val) => setSetting('formatOnSave', val)
    },
    {
      id: 'autoSave',
      category: 'commonlyUsed',
      label: 'Files: Auto Save',
      description: 'Controls auto save of editors that have unsaved changes.',
      type: 'select',
      options: [
        { id: 'off', name: 'off' },
        { id: 'afterDelay', name: 'afterDelay' },
        { id: 'onFocusChange', name: 'onFocusChange' },
        { id: 'onWindowChange', name: 'onWindowChange' }
      ],
      value: settings.autoSave || 'afterDelay',
      onChange: (val) => setSetting('autoSave', val)
    },
    {
      id: 'defaultFormatter',
      category: 'commonlyUsed',
      label: 'Editor: Default Formatter',
      description: 'Defines a default formatter which takes precedence over all other formatter settings. Must be the identifier of an extension contributing a formatter.',
      type: 'select',
      options: [
        { id: 'None', name: 'None' },
        { id: 'Prettier', name: 'Prettier' },
        { id: 'ESLint', name: 'ESLint' },
        { id: 'Aeres AI Formatter', name: 'Aeres AI Formatter' }
      ],
      value: settings.defaultFormatter || 'None',
      onChange: (val) => setSetting('defaultFormatter', val)
    },
    // Text Editor Category
    {
      id: 'tabSize',
      category: 'textEditor',
      label: 'Editor: Tab Size',
      description: 'The number of spaces a tab is equal to.',
      type: 'select',
      options: [
        { id: '2', name: '2' },
        { id: '4', name: '4' },
        { id: '8', name: '8' }
      ],
      value: String(settings.tabSize || 2),
      onChange: (val) => setSetting('tabSize', parseInt(val))
    },
    {
      id: 'fontFamily',
      category: 'textEditor',
      label: 'Editor: Font Family',
      description: 'Controls the font family.',
      type: 'select',
      options: FONT_OPTIONS,
      value: settings.fontFamily || "'JetBrains Mono', monospace",
      onChange: (val) => setSetting('fontFamily', val)
    },
    {
      id: 'wordWrap',
      category: 'textEditor',
      label: 'Editor: Word Wrap',
      description: 'Controls how lines should wrap.',
      type: 'select',
      options: [
        { id: 'off', name: 'off' },
        { id: 'on', name: 'on' },
        { id: 'wordWrapColumn', name: 'wordWrapColumn' },
        { id: 'bounded', name: 'bounded' }
      ],
      value: settings.wordWrap || 'off',
      onChange: (val) => setSetting('wordWrap', val)
    },
    {
      id: 'minimap',
      category: 'textEditor',
      label: 'Editor: Minimap',
      description: 'Controls whether the minimap is shown.',
      type: 'checkbox',
      value: settings.minimap !== false,
      onChange: (val) => setSetting('minimap', val)
    },
    // Workbench Category
    // Themes Category
    {
      id: 'workbenchTheme',
      category: 'themes',
      label: 'Workbench: Color Theme',
      description: 'Specifies the color theme used in the workbench.',
      type: 'select',
      options: THEME_OPTIONS,
      value: activeTheme,
      onChange: (val) => setTheme(val),
      sub: 'color'
    },
    {
      id: 'fileIconTheme',
      category: 'themes',
      label: 'Workbench: File Icon Theme',
      description: 'Specifies the file icon theme used in the workbench.',
      type: 'select',
      options: FILE_ICON_OPTIONS,
      value: activeFileIconTheme,
      onChange: (val) => setFileIconTheme(val),
      sub: 'fileIcons'
    },
    {
      id: 'productIconTheme',
      category: 'themes',
      label: 'Workbench: Product Icon Theme',
      description: 'Specifies the product icon theme used in the workbench.',
      type: 'select',
      options: PRODUCT_ICON_OPTIONS,
      value: activeProductIconTheme,
      onChange: (val) => setProductIconTheme(val),
      sub: 'productIcons'
    },
    {
      id: 'startupEditor',
      category: 'workbench',
      label: 'Workbench: Startup Editor',
      description: 'Controls which editor is shown at startup.',
      type: 'select',
      options: [
        { id: 'none', name: 'none' },
        { id: 'welcomePage', name: 'welcomePage' },
        { id: 'newUntitledFile', name: 'newUntitledFile' }
      ],
      value: settings.startupEditor || 'welcomePage',
      onChange: (val) => setSetting('startupEditor', val)
    },
    // Window Category
    {
      id: 'titleBarStyle',
      category: 'window',
      label: 'Window: Title Bar Style',
      description: 'Adjust the appearance of the window title bar.',
      type: 'select',
      options: [
        { id: 'custom', name: 'custom' },
        { id: 'native', name: 'native' }
      ],
      value: settings.titleBarStyle || 'custom',
      onChange: (val) => setSetting('titleBarStyle', val)
    },
    {
      id: 'zoomLevel',
      category: 'window',
      label: 'Window: Zoom Level',
      description: 'Adjust the zoom level of the window.',
      type: 'number',
      value: settings.zoomLevel || 0,
      onChange: (val) => setSetting('zoomLevel', parseInt(val) || 0)
    },
    // Chat Category
    {
      id: 'chatSuggestions',
      category: 'chat',
      label: 'Chat: Live Suggestions',
      description: 'Enable real-time AI suggestions inside the Chat and Agent panels.',
      type: 'checkbox',
      value: settings.chatSuggestions !== false,
      onChange: (val) => setSetting('chatSuggestions', val)
    },
    {
      id: 'groqApiKey',
      category: 'chat',
      label: 'AI: Groq API Key',
      description: 'Set your Groq API Key for the RAG and AI features. Overrides the backend .env default.',
      type: 'text',
      value: settings.groqApiKey || '',
      onChange: (val) => setSetting('groqApiKey', val)
    },
    // Features Category
    {
      id: 'commandHistory',
      category: 'features',
      label: 'Features: Command Palette History',
      description: 'Controls the number of recently used commands kept in history.',
      type: 'number',
      value: settings.commandHistory || 50,
      onChange: (val) => setSetting('commandHistory', parseInt(val) || 50)
    },
    // Application Category
    {
      id: 'telemetryLevel',
      category: 'application',
      label: 'Application: Telemetry Level',
      description: 'Enable telemetry collection to help improve Aeres IDE.',
      type: 'select',
      options: [
        { id: 'all', name: 'all' },
        { id: 'error', name: 'error' },
        { id: 'crash', name: 'crash' },
        { id: 'off', name: 'off' }
      ],
      value: settings.telemetryLevel || 'off',
      onChange: (val) => setSetting('telemetryLevel', val)
    },
    // Security Category
    {
      id: 'workspaceTrust',
      category: 'security',
      label: 'Security: Workspace Trust',
      description: 'Controls whether Aeres IDE prompts you to trust folders before opening.',
      type: 'checkbox',
      value: settings.workspaceTrust !== false,
      onChange: (val) => setSetting('workspaceTrust', val)
    },
    // Extensions Category
    {
      id: 'extensionsAutoUpdate',
      category: 'extensions',
      label: 'Extensions: Auto Update',
      description: 'Automatically install updates for extensions.',
      type: 'checkbox',
      value: settings.extensionsAutoUpdate !== false,
      onChange: (val) => setSetting('extensionsAutoUpdate', val)
    }
  ]

  // Filter settings based on active category OR search query
  const filteredSettings = allSettings.filter((item) => {
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    }
    if (item.category === 'themes') {
      return item.category === selectedCategory && item.sub === themeTab
    }
    return item.category === selectedCategory
  })

  const currentCategoryName = sidebarCategories.find(c => c.id === selectedCategory)?.name || 'Commonly Used'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-[960px] h-[640px] bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#cccccc] font-sans pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 1. Header Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#1e1e1e] select-none text-[12px] text-[#969696] shrink-0">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              title="Open Settings (JSON)"
              onClick={() => {
                const state = useStore.getState();
                const settingsContent = JSON.stringify(state.editorSettings || {}, null, 2);
                state.openTab({
                  path: 'settings.json',
                  name: 'settings.json',
                  content: settingsContent,
                  language: 'json',
                  virtual: true
                });
                onClose();
              }}
              className="hover:text-white transition flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13a1 1 0 0 0 1-1V9a1 1 0 0 1 1-1h1M16 13a1 1 0 0 1-1-1V9a1 1 0 0 0-1-1h-1M12 11h.01"/></svg>
            </button>
            <button onClick={onClose} className="hover:text-white transition flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {/* 2. Search and Tabs Header */}
        <div className="bg-[#252526] px-6 pt-3 pb-0 border-b border-[#2d2d2d] flex flex-col gap-2 shrink-0 select-none">
          <div className="flex items-center justify-between">
            {/* Search Input Box */}
            <div className="relative w-96">
              <input 
                type="text" 
                placeholder="Search settings" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#3c3c3c] text-white border border-[#3c3c3c] focus:border-[#007acc] rounded px-2.5 py-1.5 text-xs outline-none pr-8 transition-colors"
              />
              <div className="absolute right-2.5 top-2 text-[#969696] hover:text-white cursor-pointer flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </div>
            </div>
            {/* Sync Status */}
            <div className="text-[10.5px] text-[#969696]">
              Last synced: 0 secs ago
            </div>
          </div>

          {/* User / Workspace Tabs */}
          <div className="flex gap-5 text-xs mt-1">
            <button 
              className={`pb-2 px-1 relative transition-colors ${activeTab === 'user' ? 'text-white font-medium' : 'text-[#969696] hover:text-white'}`}
              onClick={() => setActiveTab('user')}
            >
              User
              {activeTab === 'user' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#007acc]" />}
            </button>
            <button 
              className={`pb-2 px-1 relative transition-colors ${activeTab === 'workspace' ? 'text-white font-medium' : 'text-[#969696] hover:text-white'}`}
              onClick={() => setActiveTab('workspace')}
            >
              Workspace
              {activeTab === 'workspace' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#007acc]" />}
            </button>
          </div>
        </div>

        {/* 3. Main Workspace Layout */}
        <div className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
          
          {/* Left Sidebar categories with circle indicators like Image 2 */}
          <div className="w-[200px] border-r border-[#2d2d2d] bg-[#252526] py-3 text-xs overflow-y-auto shrink-0 select-none scrollbar-hide">
            {sidebarCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id)
                  setSearchQuery('')
                }}
                className={`w-full text-left px-5 py-2 flex items-center justify-between transition-colors ${
                  selectedCategory === cat.id && searchQuery === ''
                    ? 'text-white bg-[#37373d] font-semibold border-l-2 border-[#007acc]' 
                    : 'text-[#969696] hover:text-[#cccccc]'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[#858585] text-[10px] w-3">
                    {cat.hasSub ? '›' : ''}
                  </span>
                  <span>{cat.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right Scrollable Settings Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans scrollbar-thin text-xs">
            <h2 className="text-xl font-normal text-white mb-2">
              {searchQuery.trim() !== '' ? 'Search Results' : currentCategoryName}
            </h2>

            {selectedCategory === 'themes' && searchQuery === '' && (
              <div className="flex gap-4 border-b border-[#2d2d2d] mb-4 select-none">
                <button 
                  className={`pb-2 px-1 relative text-[11px] uppercase tracking-wider font-bold transition-all ${themeTab === 'color' ? 'text-aeres-violet' : 'text-[#969696] hover:text-white'}`}
                  onClick={() => setThemeTab('color')}
                >
                  Color Themes
                  {themeTab === 'color' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-aeres-violet" />}
                </button>
                <button 
                  className={`pb-2 px-1 relative text-[11px] uppercase tracking-wider font-bold transition-all ${themeTab === 'fileIcons' ? 'text-aeres-violet' : 'text-[#969696] hover:text-white'}`}
                  onClick={() => setThemeTab('fileIcons')}
                >
                  File Icon Themes
                  {themeTab === 'fileIcons' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-aeres-violet" />}
                </button>
                <button 
                  className={`pb-2 px-1 relative text-[11px] uppercase tracking-wider font-bold transition-all ${themeTab === 'productIcons' ? 'text-aeres-violet' : 'text-[#969696] hover:text-white'}`}
                  onClick={() => setThemeTab('productIcons')}
                >
                  Product Icon Themes
                  {themeTab === 'productIcons' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-aeres-violet" />}
                </button>
              </div>
            )}

            {filteredSettings.length === 0 ? (
              <div className="text-[#969696] py-4">No settings found.</div>
            ) : (
              <div className="space-y-6 max-w-2xl">
                {filteredSettings.map((item) => (
                  <div key={item.id} className="border-b border-[#2d2d2d] pb-5 last:border-b-0">
                    {/* Header / Title */}
                    <div className="text-white font-medium text-[13px] mb-1">
                      {item.label}
                    </div>

                    {/* Description */}
                    <div className="text-[#969696] leading-relaxed mb-3 text-[11.5px]">
                      {item.description}
                    </div>

                    {/* Dynamic Inputs according to Setting Type */}
                    <div className="mt-2.5">
                      {item.type === 'number' && (
                        <input
                          type="number"
                          value={item.value}
                          onChange={(e) => item.onChange(e.target.value)}
                          className="w-24 bg-[#3c3c3c] text-white border border-[#3c3c3c] focus:border-[#007acc] rounded px-2 py-1 text-xs outline-none transition-colors"
                        />
                      )}

                      {item.type === 'checkbox' && (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.value}
                            onChange={(e) => item.onChange(e.target.checked)}
                            className="accent-[#007acc] w-3.5 h-3.5 cursor-pointer bg-[#3c3c3c] border border-[#3c3c3c] rounded"
                          />
                        </label>
                      )}

                      {item.type === 'text' && (
                        <input
                          type="text"
                          value={item.value}
                          onChange={(e) => item.onChange(e.target.value)}
                          className="w-full max-w-sm bg-[#3c3c3c] text-white border border-[#3c3c3c] focus:border-[#007acc] rounded px-2 py-1 text-xs outline-none transition-colors"
                        />
                      )}

                      {item.type === 'select' && (
                        <div className="relative w-64">
                          <select
                            value={item.value}
                            onChange={(e) => item.onChange(e.target.value)}
                            className="w-full bg-[#3c3c3c] text-white border border-[#3c3c3c] focus:border-[#007acc] rounded px-2.5 py-1.5 text-xs outline-none cursor-pointer appearance-none"
                          >
                            {item.options.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-2.5 pointer-events-none text-[#969696] flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 4. Footer Status / Save block */}
        <div className="px-6 py-3.5 bg-[#252526] border-t border-[#2d2d2d] flex justify-between items-center shrink-0 text-[11px] text-[#969696]">
          <span>All modified settings are synchronized and saved automatically.</span>
          <button 
            onClick={onClose}
            className="px-5 py-1.5 bg-[#007acc] text-white font-medium rounded hover:bg-[#0062a3] transition active:scale-[0.98] cursor-pointer"
          >
            OK
          </button>
        </div>

      </div>
    </div>
  )
}
