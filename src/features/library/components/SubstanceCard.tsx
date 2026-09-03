import { formatDuration, messages } from '../../../app/i18n/pt-BR.messages'
import type { Duration, DurationRange } from '../../../domain/shared/types.datetime'
import type { LibraryItemView } from '../lib/view'
import { OriginBadge } from './OriginBadge'

function isDurationRange(d: Duration): d is DurationRange {
  return 'min' in d
}

export interface SubstanceCardProps {
  item: LibraryItemView
  onSelect: (item: LibraryItemView) => void
}

export function SubstanceCard({ item, onSelect }: SubstanceCardProps) {
  const isBlend = item.kind === 'blend'
  const primaryProfile = item.profiles[0]

  return (
    <article className="substance-card" onClick={() => onSelect(item)}>
      <div className="card-header">
        <div className="card-title-row">
          <span className="card-color-indicator" data-color={item.color} />
          <h2 className="card-title">{item.name}</h2>
        </div>
        <div className="card-badges">
          <span className={`kind-badge ${isBlend ? 'kind-badge-blend' : 'kind-badge-single'}`}>
            {isBlend ? messages.library.blendKind : messages.library.singleKind}
          </span>
          <OriginBadge origin={item.origin} />
        </div>
      </div>

      <div className="card-body">
        {isBlend ? (
          <p className="card-summary">
            {item.substance.kind === 'blend'
              ? `${item.substance.components.length} componentes proporcionais`
              : ''}
          </p>
        ) : primaryProfile ? (
          <div className="card-pk-preview">
            <span className="pk-metric">
              <strong>T½:</strong>{' '}
              {isDurationRange(primaryProfile.halfLife)
                ? `Faixa de ${formatDuration(primaryProfile.halfLife.min)} a ${formatDuration(primaryProfile.halfLife.max)}`
                : formatDuration(primaryProfile.halfLife)}
            </span>
            <span className="pk-metric">
              <strong>Tmax:</strong>{' '}
              {primaryProfile.tmaxSpec.kind === 'value'
                ? formatDuration(primaryProfile.tmaxSpec.value)
                : primaryProfile.tmaxSpec.kind === 'instant'
                  ? 'instantânea'
                  : 'faixa'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="card-footer">
        <button
          type="button"
          className="card-open-btn"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(item)
          }}
          aria-label={`Ver detalhes de ${item.name}`}
        >
          Ver detalhes
        </button>
      </div>
    </article>
  )
}
