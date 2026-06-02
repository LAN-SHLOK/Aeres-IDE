import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store.js'
import { getFileIcon } from '../../utils/getFileIcon.jsx'

function SortableTab({ tab, isActive, onClose, onPin }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : 1,
  }

  const theme = useStore((s) => s.theme)
  const fileIconTheme = useStore((s) => s.fileIconTheme)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => useStore.getState().openTab(tab)}
      className={`group relative flex cursor-pointer items-center gap-2 border-r border-slate-800 px-3 text-[11px] transition-colors ${
        isActive
          ? 'bg-slate-900 text-slate-100'
          : 'bg-slate-950/50 text-slate-500 hover:bg-slate-900/50 hover:text-slate-300'
      } ${tab.isPinned ? 'min-w-[40px]' : ''}`}
    >
      {/* Active tab top indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-aeres-violet" />
      )}
      
      {!tab.isPinned && (
        <div className="flex items-center gap-1.5 py-2.5 min-w-0 flex-1">
          {getFileIcon(tab.name, theme, fileIconTheme)}
          <span className="truncate font-medium">{tab.name}</span>
        </div>
      )}
      
      {tab.isPinned && (
        <div className="flex items-center justify-center py-2.5">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-aeres-violet"><path d="M21 10h-8V2l-7 12h5v8z"/></svg>
        </div>
      )}

      {tab.isDirty ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" title="Unsaved Changes" />
      ) : null}

      {!tab.isPinned && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            if (tab.isDirty && !window.confirm(`Save changes to ${tab.name}?`)) return
            onClose(tab.id)
          }}
          className={`ml-1 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded transition-all ${
            isActive ? 'text-aeres-text hover:bg-white/10' : 'text-transparent group-hover:text-aeres-muted hover:bg-white/5 hover:text-aeres-text'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
    </div>
  )
}


export default function EditorTabs() {
  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const closeTab = useStore((s) => s.closeTab)
  const pinTab = useStore((s) => s.pinTab)
  const showBlame = useStore((s) => s.showBlame)
  const showTemporal = useStore((s) => s.showTemporal)
  const activeSidebarTab = useStore((s) => s.activeSidebarTab)
  const setActiveSidebarTab = useStore((s) => s.setActiveSidebarTab)
  const terminalPanelOpen = useStore((s) => s.terminalPanelOpen)
  const rightPanelOpen = useStore((s) => s.rightPanelOpen)
  const theme = useStore((s) => s.theme)
  const fileIconTheme = useStore((s) => s.fileIconTheme)
  const [showDropdown, setShowDropdown] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (tabs.length === 0) return null

  // Sort tabs: pinned first
  const sortedTabs = [...tabs].sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1))

  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id)
      const newIndex = tabs.findIndex((t) => t.id === over.id)
      useStore.setState({ tabs: arrayMove(tabs, oldIndex, newIndex) })
    }
  }

  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-slate-800 bg-slate-950">
      <div className="flex-1 overflow-x-auto scrollbar-hide flex items-stretch">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedTabs.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            {sortedTabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onClose={closeTab}
                onPin={pinTab}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="relative flex items-center border-l border-aeres-border px-1">
        <button
          onClick={() => useStore.getState().setShowTemporal(!showTemporal)}
          className={`flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 transition-colors ${showTemporal ? 'text-amber-400' : 'text-slate-500 hover:text-white'}`}
          title="Toggle Temporal Code Lens (Ctrl+Alt+T)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </button>

        <button
          onClick={() => useStore.getState().setShowBlame(!showBlame)}
          className={`flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 transition-colors ${showBlame ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
          title="Toggle Git Blame"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/><path d="M12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </button>

        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 text-aeres-muted hover:text-white transition"
          title="Show Opened Editors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={() => {
            if (activeSidebarTab) {
              setActiveSidebarTab(null)
            } else {
              setActiveSidebarTab('files')
            }
          }}
          className={`flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 transition-colors ${activeSidebarTab ? 'text-[#7C3AED]' : 'text-slate-500 hover:text-white'}`}
          title="Toggle Sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
        </button>

        <button
          onClick={() => useStore.setState({ terminalPanelOpen: !terminalPanelOpen })}
          className={`flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 transition-colors ${terminalPanelOpen ? 'text-[#7C3AED]' : 'text-slate-500 hover:text-white'}`}
          title="Toggle Bottom Panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18"/></svg>
        </button>

        <button
          onClick={() => useStore.getState().toggleRightPanel()}
          className={`flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 transition-colors ${rightPanelOpen ? 'text-[#7C3AED]' : 'text-slate-500 hover:text-white'}`}
          title="Toggle Right Panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full z-[100] mt-1 w-64 rounded-md border border-aeres-border bg-aeres-surface py-1 shadow-2xl">
             <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-aeres-muted border-b border-aeres-border mb-1">Opened Editors</div>
             <div className="max-h-60 overflow-y-auto">
                {tabs.map(t => (
                  <div
                    key={t.id}
                    onClick={() => {
                      useStore.getState().openTab(t)
                      setShowDropdown(false)
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 text-[12px] cursor-pointer hover:bg-aeres-violet hover:text-white transition-colors ${t.id === activeTabId ? 'text-aeres-blue font-semibold' : 'text-aeres-text'}`}
                  >
                    {getFileIcon(t.name, theme, fileIconTheme)}
                    <span className="truncate flex-1">{t.name}</span>
                    {t.isDirty && <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
