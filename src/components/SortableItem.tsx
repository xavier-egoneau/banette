import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGripVertical, faTrash } from '@fortawesome/free-solid-svg-icons'
import { AnyItem, isTodo, Priority } from '../types'

function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'haute': return 'bg-red-400'
    case 'normale': return 'bg-amber-400'
    case 'basse': return 'bg-green-400'
  }
}

function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'haute': return 'Haute'
    case 'normale': return 'Normale'
    case 'basse': return 'Basse'
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

interface SortableItemProps {
  item: AnyItem
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onToggleCompleted?: (e: React.MouseEvent) => void
}

export function SortableItem({
  item,
  isSelected,
  onSelect,
  onDelete,
  onToggleCompleted
}: SortableItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group px-4 py-3 border-b border-paper-line/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-paper-border/40' : 'hover:bg-paper-dark/60'
      } ${isDragging ? 'shadow-md rounded' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Drag handle */}
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-70 text-ink-light cursor-grab active:cursor-grabbing transition-opacity"
            title="Réorganiser"
          >
            <FontAwesomeIcon icon={faGripVertical} className="text-xs" />
          </span>

          {/* Checkbox pour todos */}
          {isTodo(item) && onToggleCompleted && (
            <button
              onClick={onToggleCompleted}
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
              isTodo(item) && item.completed ? 'line-through text-ink-light' : 'text-ink-dark'
            }`}
          >
            {item.title}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-ink-light hover:text-red-500 transition-all p-0.5"
          title="Supprimer"
        >
          <FontAwesomeIcon icon={faTrash} className="text-xs" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-1 pl-5">
        {isTodo(item) && (
          <span className="inline-flex items-center gap-1 text-xs font-ui text-ink-light">
            <span className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(item.priority)}`} />
            {getPriorityLabel(item.priority)}
          </span>
        )}
        <span className="text-xs text-ink-light font-ui">{formatDate(item.updated)}</span>
      </div>
    </li>
  )
}
