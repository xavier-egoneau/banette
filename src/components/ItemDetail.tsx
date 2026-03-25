import { useState, useEffect, useCallback, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { Note, Todo, ItemType, isTodo, Priority } from '../types'
import { Editor } from './Editor'
import { DeleteModal } from './DeleteModal'
import { useAutoSave } from '../hooks/useAutoSave'

interface ItemDetailProps {
  item: Note | Todo
  type: ItemType
  onBack: () => void
  onDeleted: () => void
  onSaved?: () => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'haute', label: 'Haute', color: 'bg-red-400' },
  { value: 'normale', label: 'Normale', color: 'bg-amber-400' },
  { value: 'basse', label: 'Basse', color: 'bg-green-400' }
]

export function ItemDetail({ item, type, onBack, onDeleted, onSaved }: ItemDetailProps): JSX.Element {
  const [title, setTitle] = useState(item.title)
  const [content, setContent] = useState(item.content)
  const [priority, setPriority] = useState<Priority>(isTodo(item) ? item.priority : 'normale')
  const [completed, setCompleted] = useState(isTodo(item) ? item.completed : false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Reset state and focus title when item changes
  useEffect(() => {
    setTitle(item.title)
    setContent(item.content)
    if (isTodo(item)) {
      setPriority(item.priority)
      setCompleted(item.completed)
    }
    // Focus + select all so the user can type the title directly
    requestAnimationFrame(() => {
      titleRef.current?.focus()
      titleRef.current?.select()
    })
  }, [item.id])

  const saveItem = useCallback(
    async (data: { title: string; content: string; priority: Priority; completed: boolean }) => {
      const channel = type === 'notes' ? 'notes:update' : 'todos:update'
      const updates =
        type === 'notes'
          ? { title: data.title, content: data.content }
          : {
              title: data.title,
              content: data.content,
              priority: data.priority,
              completed: data.completed
            }
      await window.electron.invoke(channel, item.id, updates)
      setLastSaved(new Date())
      onSaved?.()
    },
    [item.id, type, onSaved]
  )

  useAutoSave({ title, content, priority, completed }, saveItem)

  const handleDelete = async () => {
    const channel = type === 'notes' ? 'notes:delete' : 'todos:delete'
    await window.electron.invoke(channel, item.id)
    setShowDeleteModal(false)
    onDeleted()
  }

  const handlePriorityChange = (newPriority: Priority) => {
    setPriority(newPriority)
  }

  const handleCompletedChange = () => {
    setCompleted((prev) => !prev)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-paper-border drag-region">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-ink hover:text-ink-dark font-ui transition-colors no-drag"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          <span>Retour</span>
        </button>

        <div className="flex items-center gap-2 no-drag">
          {lastSaved && (
            <span className="text-xs text-ink-light font-ui opacity-70">
              Sauvegardé
            </span>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-ui transition-colors px-2 py-1 rounded hover:bg-red-50"
          >
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
            <span>Supprimer</span>
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-2 border-b border-paper-border">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sans titre"
          className="w-full text-xl font-semibold text-ink-dark bg-transparent border-none outline-none font-content placeholder-ink-light/40"
        />

        {/* Todo-specific controls */}
        {type === 'todos' && (
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={handleCompletedChange}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  completed
                    ? 'bg-amber-400 border-amber-400 text-white'
                    : 'border-paper-border hover:border-ink-light'
                }`}
              >
                {completed && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7z" />
                  </svg>
                )}
              </button>
              <span className="text-sm font-ui text-ink">
                {completed ? 'Complété' : 'En cours'}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs font-ui text-ink-light">Priorité :</span>
              <div className="flex gap-1">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handlePriorityChange(opt.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-ui transition-colors ${
                      priority === opt.value
                        ? 'bg-paper-border text-ink-dark font-medium'
                        : 'text-ink hover:bg-paper-line/50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          content={content}
          onChange={setContent}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-paper-border bg-paper-dark/30">
        <p className="text-xs text-ink-light font-ui">
          Créé le {formatDate(item.created)}
        </p>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        title={title}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  )
}
