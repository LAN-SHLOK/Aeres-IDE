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

function SortableTab({ tab, isActive, onClose }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => useStore.getState().openTab(tab)}
      className={`group relative flex cursor-pointer items-center gap-1.5 border-r border-white/[0.04] px-3.5 text-xs transition-all duration-200 ${
        isActive
          ? 'bg-aether-bg text-white'
          : 'text-white/35 hover:text-white/60 hover:bg-white/[0.02]'
      }`}
    >
      {/* Active tab bottom indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-aether-violet to-blue-500" />
      )}
      {tab.isDirty && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" title="Unsaved changes" />
      )}
      <span className="max-w-[120px] truncate font-medium">{tab.name}</span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          if (tab.isDirty && !window.confirm(`Save changes to ${tab.name}?`)) return
          onClose(tab.id)
        }}
        className="ml-1 hidden h-4 w-4 shrink-0 items-center justify-center rounded text-white/20 transition hover:bg-white/10 hover:text-white group-hover:flex"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  )
}


export default function EditorTabs() {
  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const closeTab = useStore((s) => s.closeTab)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (tabs.length === 0) return null

  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id)
      const newIndex = tabs.findIndex((t) => t.id === over.id)
      useStore.setState({ tabs: arrayMove(tabs, oldIndex, newIndex) })
    }
  }

  return (
    <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-aether-border bg-aether-surface scrollbar-hide">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.map((t) => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          {tabs.map((tab) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onClose={closeTab}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
