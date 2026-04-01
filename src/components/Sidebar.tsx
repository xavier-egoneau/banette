import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faNoteSticky, faListCheck, faStopwatch, faMoon, faSun, faGear } from '@fortawesome/free-solid-svg-icons'
import { ItemType } from '../types'

interface SidebarProps {
  activeSection: ItemType
  onSectionChange: (section: ItemType) => void
  darkMode: boolean
  onToggleDarkMode: () => void
  onOpenSettings: () => void
}

export function Sidebar({ activeSection, onSectionChange, darkMode, onToggleDarkMode, onOpenSettings }: SidebarProps): JSX.Element {
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

        <button
          onClick={() => onSectionChange('timers')}
          className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 text-sm font-ui transition-colors flex items-center gap-2 ${
            activeSection === 'timers'
              ? 'bg-paper-border text-ink-dark font-semibold'
              : 'text-ink hover:bg-paper-line/50 hover:text-ink-dark'
          }`}
        >
          <FontAwesomeIcon icon={faStopwatch} className="w-4" />
          <span>Timers</span>
        </button>
      </nav>

      <div className="px-2 py-3 flex items-center justify-between border-t border-paper-border">
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg text-ink-light hover:text-ink hover:bg-paper-line/50 transition-colors"
          title={darkMode ? 'Mode clair' : 'Mode sombre'}
        >
          <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="text-sm" />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-ink-light hover:text-ink hover:bg-paper-line/50 transition-colors"
          title="Paramètres"
        >
          <FontAwesomeIcon icon={faGear} className="text-sm" />
        </button>
        <span className="text-xs text-ink-light font-ui opacity-60 select-none">v1.0</span>
      </div>
    </div>
  )
}
