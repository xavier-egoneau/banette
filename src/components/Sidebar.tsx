import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faNoteSticky, faListCheck } from '@fortawesome/free-solid-svg-icons'
import { ItemType } from '../types'

interface SidebarProps {
  activeSection: ItemType
  onSectionChange: (section: ItemType) => void
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps): JSX.Element {
  return (
    <div className="sidebar flex flex-col w-40 min-w-[140px] bg-paper-dark border-r border-paper-border h-full">
      <div className="app-title px-4 py-4 drag-region">
        <h1 className="text-ink-dark font-bold text-lg tracking-wide font-ui select-none">
          BANETTE
        </h1>
      </div>

      <nav className="flex-1 px-2 py-2">
        <button
          onClick={() => onSectionChange('todos')}
          className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 text-sm font-ui transition-colors flex items-center gap-2 ${
            activeSection === 'todos'
              ? 'bg-paper-border text-ink-dark font-semibold'
              : 'text-ink hover:bg-paper-line/50 hover:text-ink-dark'
          }`}
        >
          <FontAwesomeIcon icon={faListCheck} className="w-4" />
          <span>Todos</span>
        </button>

        <button
          onClick={() => onSectionChange('notes')}
          className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 text-sm font-ui transition-colors flex items-center gap-2 ${
            activeSection === 'notes'
              ? 'bg-paper-border text-ink-dark font-semibold'
              : 'text-ink hover:bg-paper-line/50 hover:text-ink-dark'
          }`}
        >
          <FontAwesomeIcon icon={faNoteSticky} className="w-4" />
          <span>Notes</span>
        </button>
      </nav>

      <div className="px-4 py-3 text-xs text-ink-light font-ui opacity-60 select-none">
        v1.0.0
      </div>
    </div>
  )
}
