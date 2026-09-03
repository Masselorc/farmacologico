import { messages } from '../../../app/i18n/pt-BR.messages'
import type { OriginFilterKind } from '../lib/view'

export interface OriginFilterProps {
  value: OriginFilterKind
  onChange: (value: OriginFilterKind) => void
}

export function OriginFilter({ value, onChange }: OriginFilterProps) {
  const options: Array<{ kind: OriginFilterKind; label: string }> = [
    { kind: 'all', label: messages.library.filterAll },
    { kind: 'legacy_unattributed', label: messages.library.filterLegacy },
    { kind: 'literature', label: messages.library.filterLiterature },
    { kind: 'user_defined', label: messages.library.filterUser },
  ]

  return (
    <div className="origin-filter-container" role="radiogroup" aria-label={messages.library.filterOriginLabel}>
      <span className="origin-filter-label">{messages.library.filterOriginLabel}</span>
      <div className="origin-filter-buttons">
        {options.map((opt) => (
          <button
            key={opt.kind}
            type="button"
            role="radio"
            aria-checked={value === opt.kind}
            className={`origin-filter-btn ${value === opt.kind ? 'active' : ''}`}
            onClick={() => onChange(opt.kind)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
