import { messages } from '../../../app/i18n/pt-BR.messages'

export interface LibrarySearchProps {
  value: string
  onChange: (value: string) => void
}

export function LibrarySearch({ value, onChange }: LibrarySearchProps) {
  return (
    <div className="library-search-container">
      <label htmlFor="library-search-input" className="library-search-label">
        {messages.library.searchLabel}
      </label>
      <input
        id="library-search-input"
        type="search"
        className="library-search-input"
        placeholder={messages.library.searchPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={messages.library.searchLabel}
      />
    </div>
  )
}
