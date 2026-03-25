import { useState, useEffect, useCallback } from 'react'
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
import { faNoteSticky, faListCheck } from '@fortawesome/free-solid-svg-icons'
import { Note, Todo, ItemType, AnyItem } from '../types'
import { SearchBar } from './SearchBar'
import { DeleteModal } from './DeleteModal'
import { SortableItem } from './SortableItem'

interface ItemListProps {
  type: ItemType
  onSelectItem: (item: AnyItem) => void
  onRefreshRef?: (fn: () => void) => void
}

export function ItemList({ type, onSelectItem, onRefreshRef }: ItemListProps): JSX.Element {
  const [items, setItems] = useState<AnyItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnyItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const loadItems = useCallback(async () => {
    const channel = type === 'notes' ? 'notes:list' : 'todos:list'
    const result = await window.electron.invoke(channel)
    setItems(result as AnyItem[])
  }, [type])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    if (onRefreshRef) onRefreshRef(loadItems)
  }, [onRefreshRef, loadItems])

  const handleCreate = async () => {
    if (type === 'notes') {
      const note = (await window.electron.invoke('notes:create', 'Nouvelle note', '')) as Note
      await loadItems()
      onSelectItem(note)
    } else {
      const todo = (await window.electron.invoke(
        'todos:create',
        'Nouvelle todo',
        '',
        'normale'
      )) as Todo
      await loadItems()
      onSelectItem(todo)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const channel = type === 'notes' ? 'notes:delete' : 'todos:delete'
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

    const channel = type === 'notes' ? 'notes:reorder' : 'todos:reorder'
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
    [selectedId, items]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // En mode recherche, on affiche les résultats filtrés sans drag
  const isSearching = search.length > 0
  const filtered = isSearching
    ? items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-paper-border flex items-center justify-between gap-3 drag-region">
        <span className="text-xs font-semibold text-ink-light uppercase tracking-wider font-ui select-none">
          {type === 'notes' ? 'Notes' : 'Todos'}
        </span>
        <button
          onClick={handleCreate}
          className="px-3 py-1.5 bg-ink text-paper-light text-xs font-ui font-medium rounded-lg hover:bg-ink-dark transition-colors no-drag"
        >
          + Ajouter
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-paper-border">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-ink-light">
            <FontAwesomeIcon
              icon={type === 'notes' ? faNoteSticky : faListCheck}
              className="text-4xl mb-3 opacity-40"
            />
            <p className="text-sm font-ui">
              {isSearching ? 'Aucun résultat' : `Aucune ${type === 'notes' ? 'note' : 'todo'}`}
            </p>
          </div>
        ) : isSearching ? (
          // Mode recherche : liste simple sans drag
          <ul>
            {filtered.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onSelect={() => {
                  setSelectedId(item.id)
                  onSelectItem(item)
                }}
                onDelete={() => setDeleteTarget(item)}
                onToggleCompleted={
                  type === 'todos'
                    ? (e) => handleToggleCompleted(e, item as Todo)
                    : undefined
                }
              />
            ))}
          </ul>
        ) : (
          // Mode normal : liste avec drag & drop
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul>
                {items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    isSelected={selectedId === item.id}
                    onSelect={() => {
                      setSelectedId(item.id)
                      onSelectItem(item)
                    }}
                    onDelete={() => setDeleteTarget(item)}
                    onToggleCompleted={
                      type === 'todos'
                        ? (e) => handleToggleCompleted(e, item as Todo)
                        : undefined
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
