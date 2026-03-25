import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Rechercher...' }: SearchBarProps): JSX.Element {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light text-xs pointer-events-none">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-4 py-2 bg-paper-light border border-paper-border rounded-lg text-sm text-ink placeholder-ink-light/60 focus:outline-none focus:ring-1 focus:ring-paper-border font-ui"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink text-xs"
        >
          ✕
        </button>
      )}
    </div>
  )
}
