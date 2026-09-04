import { messages } from '../../../app/i18n/pt-BR.messages'
import { formatPresentationNumber } from '../../comparator/lib/presentation'
import type { ProtocolDayEstimate } from '../lib/estimates'

export interface EstimateChipsProps {
  estimates: ReadonlyArray<ProtocolDayEstimate>
}

export function EstimateChips({ estimates }: EstimateChipsProps) {
  if (estimates.length === 0) {
    return null
  }

  return (
    <div
      className="protocol-estimate-chips"
      role="group"
      aria-label={messages.protocols.guidesLabel}
    >
      {estimates.map((est) => {
        const formattedAmount = formatPresentationNumber(est.estimatedMg, 2)
        const chipTitle = messages.protocols.chipEstimatedTitle(
          est.protocolName,
          formattedAmount,
        )

        return (
          <div
            key={est.protocolId}
            className="protocol-estimate-chip"
            data-color={est.color.paletteColor}
            title={chipTitle}
          >
            <span className="chip-indicator" aria-hidden="true" />
            <span className="chip-name">{est.protocolName}</span>
            <span className="chip-value">{`≈ ${formattedAmount} mg`}</span>
          </div>
        )
      })}
    </div>
  )
}
