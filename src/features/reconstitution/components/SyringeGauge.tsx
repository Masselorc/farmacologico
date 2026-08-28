import { messages } from '../../../app/i18n/pt-BR.messages'
import { formatReconstitutionNumber } from '../lib/presentation'

interface SyringeGaugeProps {
  syringeUnits: number
  capacityUnits: number
}

const TICK_PERCENTAGES = [0, 25, 50, 75, 100] as const

export function SyringeGauge({ syringeUnits, capacityUnits }: SyringeGaugeProps) {
  const boundedValue = Math.min(Math.max(syringeUnits, 0), capacityUnits)
  const overflow = syringeUnits > capacityUnits
  const formattedUnits = formatReconstitutionNumber(syringeUnits)
  const formattedCapacity = formatReconstitutionNumber(capacityUnits)

  return (
    <figure className="reconstitution-gauge" data-overflow={overflow ? 'true' : 'false'}>
      <figcaption className="reconstitution-gauge__caption">{messages.reconstitution.gaugeLabel}</figcaption>
      <meter
        className="reconstitution-gauge__meter"
        min={0}
        max={capacityUnits}
        value={boundedValue}
        role="meter"
        aria-label={messages.reconstitution.gaugeLabel}
        aria-valuemin={0}
        aria-valuemax={capacityUnits}
        aria-valuenow={boundedValue}
        aria-valuetext={messages.reconstitution.gaugeValueText(formattedUnits, formattedCapacity)}
      />
      <div className="reconstitution-gauge__scale" aria-label={messages.reconstitution.gaugeScaleLabel}>
        {TICK_PERCENTAGES.map((percentage) => {
          const value = (capacityUnits * percentage) / 100
          return (
            <span className="reconstitution-gauge__tick" key={percentage}>
              <span aria-hidden="true">{percentage}%</span>
              <span>{formatReconstitutionNumber(value)} {messages.reconstitution.unitsSuffix}</span>
            </span>
          )
        })}
      </div>
      {overflow ? (
        <p className="reconstitution-gauge__overflow">
          {messages.reconstitution.calculatedUnits(formattedUnits)}
        </p>
      ) : null}
    </figure>
  )
}
