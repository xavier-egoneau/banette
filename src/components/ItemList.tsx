import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faNoteSticky, faListCheck, faStopwatch, faFileImport } from '@fortawesome/free-solid-svg-icons'
import { Note, Todo, ItemType, AnyItem, isTodo } from '../types'
import { SearchBar } from './SearchBar'
import { DeleteModal } from './DeleteModal'
import { SortableItem } from './SortableItem'

type SortMode = 'manual' | 'date' | 'priority'

const PRIORITY_ORDER = { haute: 0, normale: 1, basse: 2 }

interface ItemListProps {
  type: ItemType
  onSelectItem: (item: AnyItem) => void
  onRefreshRef?: (fn: () => void) => void
  onImported?: () => void
}

export function ItemList({ type, onSelectItem, onRefreshRef, onImported }: ItemListProps): JSX.Element {
  const [items, setItems] = useState<AnyItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnyItem | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const importingRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const loadItems = useCallback(async () => {
    const channel = type === 'notes' ? 'notes:list' : type === 'todos' ? 'todos:list' : 'timers:list'
    const result = await window.electron.invoke(channel)
    setItems(result as AnyItem[])
  }, [type])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    if (onRefreshRef) onRefreshRef(loadItems)
  }, [onRefreshRef, loadItems])

  const handleImport = useCallback(async () => {
    if (importingRef.current) return
    importingRef.current = true
    setIsImporting(true)
    try {
      await window.electron.invoke('item:import')
      await loadItems()
      onImported?.()
    } finally {
      importingRef.current = false
      setIsImporting(false)
    }
  }, [loadItems, onImported])

  const handleCreate = useCallback(async () => {
    if (type === 'notes') {
      const note = (await window.electron.invoke('notes:create', 'Nouvelle note', '')) as Note
      await loadItems()
      onSelectItem(note)
    } else if (type === 'todos') {
      const todo = (await window.electron.invoke('todos:create', 'Nouvelle todo', '', 'normale')) as Todo
      await loadItems()
      onSelectItem(todo)
    } else {
      const timer = (await window.electron.invoke('timers:create', 'Nouveau projet')) as AnyItem
      await loadItems()
      onSelectItem(timer)
    }
  }, [type, loadItems, onSelectItem])

  const handleDelete = async () => {
    if (!deleteTarget) return
    const channel = type === 'notes' ? 'notes:delete' : type === 'todos' ? 'todos:delete' : 'timers:delete'
    await window.electron.invoke(channel, deleteTarget.id)
    setDeleteTarget(null)
    if (selectedId === deleteTarget.id) setSelectedId(null)
    await loadItems()
  }

  const handleToggleCompleted = async (e: React.MouseEvent, todo: Todo) => {
    e.stopPropagation()
    await window.electron.invoke('todos:update', todo.id, { completed: !todo.completed })
    await loadItems()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)

    const channel = type === 'notes' ? 'notes:reorder' : type === 'todos' ? 'todos:reorder' : 'timers:reorder'
    await window.electron.invoke(channel, reordered.map((i) => i.id))
  }

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const target = items.find((i) => i.id === selectedId)
        if (target) setDeleteTarget(target)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        await handleCreate()
      }
    },
    [selectedId, items, handleCreate]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // All unique tags across items
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) {
      for (const tag of item.tags) set.add(tag)
    }
    return Array.from(set).sort()
  }, [items])

  // Reset active tag if it disappears from items
  useEffect(() => {
    if (activeTag && !allTags.includes(activeTag)) setActiveTag(null)
  }, [allTags, activeTag])

  const isSearching = search.length > 0
  const isDraggable = sortMode === 'manual' && !isSearching && !activeTag

  const sortedItems = useMemo(() => {
    if (sortMode === 'manual') return items
    const copy = [...items]
    if (sortMode === 'date') {
      copy.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return new Date(b.updated).getTime() - new Date(a.updated).getTime()
      })
    } else if (sortMode === 'priority') {
      copy.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        const pa = isTodo(a) ? PRIORITY_ORDER[a.priority] : 1
        const pb = isTodo(b) ? PRIORITY_ORDER[b.priority] : 1
        return pa - pb
      })
    }
    return copy
  }, [items, sortMode])

  const filtered = sortedItems.filter((item) => {
    if (activeTag && !item.tags.includes(activeTag)) return false
    if (isSearching) {
      const q = search.toLowerCase()
      return item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-paper-border flex items-center justify-between gap-3 drag-region">
        <span className="text-xs font-semibold text-ink-light uppercase tracking-wider font-ui select-none">
          {type === 'notes' ? 'Notes' : type === 'todos' ? 'Todos' : 'Timers'}
        </span>
        <div className="flex items-center gap-2 no-drag">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="text-xs font-ui bg-transparent border border-paper-border rounded px-1.5 py-1 text-ink cursor-pointer"
            title="Trier par"
          >
            <option value="manual">Manuel</option>
            <option value="date">Date</option>
            {type === 'todos' && <option value="priority">Priorité</option>}
          </select>
          {type !== 'timers' && (
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="p-1.5 text-ink-light hover:text-ink transition-colors disabled:opacity-40"
              title="Importer des fichiers .md"
            >
              <FontAwesomeIcon icon={faFileImport} className="text-sm" />
            </button>
          )}
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 bg-ink text-paper-light text-xs font-ui font-medium rounded-lg hover:bg-ink-dark transition-colors"
          >
            + {type === 'timers' ? 'Projet' : 'Ajouter'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-paper-border">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="px-4 py-2 border-b border-paper-border flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-xs font-ui px-2 py-0.5 rounded-full transition-colors ${
                activeTag === tag
                  ? 'bg-ink text-paper-light'
                  : 'bg-paper-border text-ink hover:bg-paper-border/70'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-ink-light">
            <FontAwesomeIcon
              icon={type === 'notes' ? faNoteSticky : type === 'todos' ? faListCheck : faStopwatch}
              className="text-4xl mb-3 opacity-40"
            />
            <p className="text-sm font-ui">
              {isSearching || activeTag ? 'Aucun résultat' : type === 'notes' ? 'Aucune note' : type === 'todos' ? 'Aucune todo' : 'Aucun projet'}
            </p>
          </div>
        ) : !isDraggable ? (
          <ul>
            {filtered.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                isDraggable={false}
                isSelected={selectedId === item.id}
                onSelect={() => {
                  setSelectedId(item.id)
                  onSelectItem(item)
                }}
                onDelete={() => setDeleteTarget(item)}
                onToggleCompleted={
                  type === 'todos' ? (e) => handleToggleCompleted(e, item as Todo) : undefined
                }
              />
            ))}
          </ul>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul>
                {filtered.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    isDraggable={true}
                    isSelected={selectedId === item.id}
                    onSelect={() => {
                      setSelectedId(item.id)
                      onSelectItem(item)
                    }}
                    onDelete={() => setDeleteTarget(item)}
                    onToggleCompleted={
                      type === 'todos' ? (e) => handleToggleCompleted(e, item as Todo) : undefined
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <DeleteModal
        isOpen={deleteTarget !== null}
        title={deleteTarget?.title ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
