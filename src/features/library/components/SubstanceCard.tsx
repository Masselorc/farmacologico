import { formatDuration, messages } from '../../../app/i18n/pt-BR.messages'
import type { Duration, DurationRange } from '../../../domain/shared/types.datetime'
import type { PharmacokineticProfile } from '../../../domain/library/types'
import type { LibraryItemView } from '../lib/view'
import { OriginBadge } from './OriginBadge'

function isDurationRange(d: Duration): d is DurationRange {
  return 'min' in d
}

function formatTmaxSpecification(profile: PharmacokineticProfile): string {
  switch (profile.tmaxSpec.kind) {
    case 'unknown':
      return messages.library.unspecified
    case 'instant':
      return messages.library.instantaneous
    case 'value':
      return formatDuration(profile.tmaxSpec.value)
    case 'range':
      return messages.library.rangeKind
  }
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
              ? messages.library.proportionalComponents(item.substance.components.length)
              : ''}
          </p>
        ) : primaryProfile ? (
          <div className="card-pk-preview">
            <span className="pk-metric">
              <strong>T½:</strong>{' '}
              {isDurationRange(primaryProfile.halfLife)
                ? messages.library.rangeMinMax(
                    formatDuration(primaryProfile.halfLife.min),
                    formatDuration(primaryProfile.halfLife.max),
                  )
                : formatDuration(primaryProfile.halfLife)}
            </span>
            <span className="pk-metric">
              <strong>Tmax:</strong>{' '}
              {formatTmaxSpecification(primaryProfile)}
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
          aria-label={messages.library.viewDetails(item.name)}
        >
          {messages.library.viewDetailsButton}
        </button>
      </div>
    </article>
  )
}
