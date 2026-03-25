import { useState, useEffect, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faNoteSticky, faListCheck, faTrash } from '@fortawesome/free-solid-svg-icons'
import { Note, Todo, ItemType, AnyItem, isTodo, Priority } from '../types'
import { SearchBar } from './SearchBar'
import { DeleteModal } from './DeleteModal'

interface ItemListProps {
  type: ItemType
  onSelectItem: (item: AnyItem) => void
  onRefreshRef?: (fn: () => void) => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'haute':
      return 'bg-red-400'
    case 'normale':
      return 'bg-amber-400'
    case 'basse':
      return 'bg-green-400'
  }
}

function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'haute':
      return 'Haute'
    case 'normale':
      return 'Normale'
    case 'basse':
      return 'Basse'
  }
}

export function ItemList({ type, onSelectItem, onRefreshRef }: ItemListProps): JSX.Element {
  const [items, setItems] = useState<AnyItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnyItem | null>(null)

  const loadItems = useCallback(async () => {
    const channel = type === 'notes' ? 'notes:list' : 'todos:list'
    const result = await window.electron.invoke(channel)
    setItems(result as AnyItem[])
  }, [type])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef(loadItems)
    }
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

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  )

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
            <FontAwesomeIcon icon={type === 'notes' ? faNoteSticky : faListCheck} className="text-4xl mb-3 opacity-40" />
            <p className="text-sm font-ui">
              {search ? 'Aucun résultat' : `Aucune ${type === 'notes' ? 'note' : 'todo'}`}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((item) => (
              <li
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id)
                  onSelectItem(item)
                }}
                className={`group px-4 py-3 border-b border-paper-line/50 cursor-pointer transition-colors ${
                  selectedId === item.id
                    ? 'bg-paper-border/40'
                    : 'hover:bg-paper-dark/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isTodo(item) && (
                      <button
                        onClick={(e) => handleToggleCompleted(e, item)}
                        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          item.completed
                            ? 'bg-amber-400 border-amber-400 text-white'
                            : 'border-paper-border hover:border-ink-light'
                        }`}
                        title="Marquer comme complété"
                      >
                        {item.completed && (
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7z" />
                          </svg>
                        )}
                      </button>
                    )}
                    <span
                      className={`text-sm font-ui font-medium truncate ${
                        isTodo(item) && item.completed
                          ? 'line-through text-ink-light'
                          : 'text-ink-dark'
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(item)
                    }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-ink-light hover:text-red-500 transition-all text-base p-0.5"
                    title="Supprimer"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {isTodo(item) && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-ui text-ink-light`}
                      title={`Priorité ${getPriorityLabel(item.priority)}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(item.priority)}`} />
                      {getPriorityLabel(item.priority)}
                    </span>
                  )}
                  <span className="text-xs text-ink-light font-ui">
                    {formatDate(item.updated)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
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
