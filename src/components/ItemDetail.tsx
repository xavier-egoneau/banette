import { useState, useEffect, useCallback, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faArrowLeft, faThumbtack, faEye, faPencil, faDownload } from '@fortawesome/free-solid-svg-icons'
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
  const [tags, setTags] = useState<string[]>(item.tags ?? [])
  const [pinned, setPinned] = useState(item.pinned ?? false)
  const [tagInput, setTagInput] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Reset state and focus title when item changes
  useEffect(() => {
    setTitle(item.title)
    setContent(item.content)
    setTags(item.tags ?? [])
    setPinned(item.pinned ?? false)
    setIsPreview(false)
    if (isTodo(item)) {
      setPriority(item.priority)
      setCompleted(item.completed)
    }
    requestAnimationFrame(() => {
      titleRef.current?.focus()
      titleRef.current?.select()
    })
  }, [item.id])

  const saveItem = useCallback(
    async (data: {
      title: string
      content: string
      priority: Priority
      completed: boolean
      tags: string[]
      pinned: boolean
    }) => {
      const channel = type === 'notes' ? 'notes:update' : 'todos:update'
      const updates =
        type === 'notes'
          ? { title: data.title, content: data.content, tags: data.tags, pinned: data.pinned }
          : {
              title: data.title,
              content: data.content,
              priority: data.priority,
              completed: data.completed,
              tags: data.tags,
              pinned: data.pinned
            }
      await window.electron.invoke(channel, item.id, updates)
      setLastSaved(new Date())
      onSaved?.()
    },
    [item.id, type, onSaved]
  )

  const { isSaving } = useAutoSave({ title, content, priority, completed, tags, pinned }, saveItem)

  // Auto-clear "Sauvegardé" after 3 seconds
  useEffect(() => {
    if (!lastSaved) return
    const timer = setTimeout(() => setLastSaved(null), 3000)
    return () => clearTimeout(timer)
  }, [lastSaved])

  const handleDelete = async () => {
    const channel = type === 'notes' ? 'notes:delete' : 'todos:delete'
    await window.electron.invoke(channel, item.id)
    setShowDeleteModal(false)
    onDeleted()
  }

  const handleExport = async () => {
    await window.electron.invoke('item:export', type, item.id)
  }

  const addTag = (raw: string) => {
    const tag = raw.toLowerCase().replace(/[^a-z0-9-_]/g, '').trim()
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
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

        <div className="flex items-center gap-1 no-drag">
          {isSaving ? (
            <span className="text-xs text-ink-light font-ui opacity-70 mr-1">Enregistrement…</span>
          ) : lastSaved ? (
            <span className="text-xs text-ink-light font-ui opacity-70 mr-1">Sauvegardé</span>
          ) : null}

          {/* Pin toggle */}
          <button
            onClick={() => setPinned((p) => !p)}
            className={`p-1.5 rounded transition-colors ${
              pinned
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-ink-light hover:text-ink'
            }`}
            title={pinned ? 'Désépingler' : 'Épingler'}
          >
            <FontAwesomeIcon icon={faThumbtack} className="text-xs" />
          </button>

          {/* Preview toggle */}
          <button
            onClick={() => setIsPreview((p) => !p)}
            className="p-1.5 rounded text-ink-light hover:text-ink transition-colors"
            title={isPreview ? 'Éditer' : 'Aperçu'}
          >
            <FontAwesomeIcon icon={isPreview ? faPencil : faEye} className="text-xs" />
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="p-1.5 rounded text-ink-light hover:text-ink transition-colors"
            title="Exporter en .md"
          >
            <FontAwesomeIcon icon={faDownload} className="text-xs" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-ui transition-colors px-2 py-1 rounded hover:bg-red-50 ml-1"
          >
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
            <span>Supprimer</span>
          </button>
        </div>
      </div>

      {/* Title + meta */}
      <div className="px-4 pt-4 pb-2 border-b border-paper-border">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sans titre"
          readOnly={isPreview}
          className="w-full text-xl font-semibold text-ink-dark bg-transparent border-none outline-none font-content placeholder-ink-light/40"
        />

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-paper-border text-ink-dark text-xs font-ui rounded-full"
            >
              #{tag}
              {!isPreview && (
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:text-red-500 transition-colors leading-none"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {!isPreview && (
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTag(tagInput)
                }
                if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                  removeTag(tags[tags.length - 1])
                }
              }}
              placeholder={tags.length === 0 ? 'Ajouter un tag…' : ''}
              className="text-xs font-ui bg-transparent outline-none text-ink placeholder-ink-light/40 min-w-[100px]"
            />
          )}
        </div>

        {/* Todo-specific controls */}
        {type === 'todos' && (
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => !isPreview && setCompleted((prev) => !prev)}
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

            {!isPreview && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-ui text-ink-light">Priorité :</span>
                <div className="flex gap-1">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPriority(opt.value)}
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
            )}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          content={content}
          onChange={setContent}
          editable={!isPreview}
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
