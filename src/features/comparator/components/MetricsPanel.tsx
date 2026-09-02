import { formatPkWarning, messages } from '../../../app/i18n/pt-BR.messages'
import { Temporal } from '@js-temporal/polyfill'
import type { TimeZoneId } from '../../../domain/types'
import type { ComparatorAnalyzedScenario } from '../lib/analysis'
import { getToneBorderTopClass } from '../lib/colors'
import {
  formatPresentationDateLong,
  formatPresentationMass,
} from '../lib/presentation'

export interface MetricsPanelProps {
  analyzedScenarios: ReadonlyArray<ComparatorAnalyzedScenario>
  calendarTimeZone: TimeZoneId
}

export function MetricsPanel({
  analyzedScenarios,
  calendarTimeZone,
}: MetricsPanelProps) {
  if (analyzedScenarios.length === 0) return null

  return (
    <div className="metrics-panel-container">
      <h3>{messages.comparator.metricsTitle}</h3>

      <div className="metrics-cards-grid">
        {analyzedScenarios.map((item) => {
          const { scenario, result, phaseHint } = item
          const { currentState, peak, warnings } = result

          const peakInstantIso =
            peak.timeMs !== undefined
              ? Temporal.Instant.fromEpochMilliseconds(peak.timeMs).toString()
              : ''

          return (
            <div
              key={scenario.id}
              className={`metrics-card ${getToneBorderTopClass(scenario.color)}`}
            >
              <div className="metrics-card-header">
                <h4 className="scenario-title">{scenario.name}</h4>
                <span className={`phase-hint-badge phase-${phaseHint}`}>
                  {messages.comparator.phaseHints[phaseHint]}
                </span>
              </div>

              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-label">{messages.comparator.currentCentral}</span>
                  <span className="metric-value">
                    {formatPresentationMass(currentState.centralMg, scenario.displayUnit)}
                  </span>
                </div>

                <div className="metric-item">
                  <span className="metric-label">{messages.comparator.currentDepot}</span>
                  <span className="metric-value">
                    {formatPresentationMass(currentState.depotMg, scenario.displayUnit)}
                  </span>
                </div>

                <div className="metric-item">
                  <span className="metric-label">{messages.comparator.eliminatedTotal}</span>
                  <span className="metric-value">
                    {formatPresentationMass(currentState.eliminatedMg, scenario.displayUnit)}
                  </span>
                </div>

                <div className="metric-item">
                  <span className="metric-label">{messages.comparator.administeredCount}</span>
                  <span className="metric-value">{currentState.administeredCount}</span>
                </div>

                <div className="metric-item">
                  <span className="metric-label">{messages.comparator.plannedCount}</span>
                  <span className="metric-value">{currentState.plannedCount}</span>
                </div>

                <div className="metric-item">
                  <span className="metric-label">{messages.comparator.estimatedPeak}</span>
                  <span className="metric-value">
                    {formatPresentationMass(peak.amountMg, scenario.displayUnit)}
                  </span>
                </div>

                <div className="metric-item">
                  <span className="metric-label">{messages.comparator.peakTime}</span>
                  <span className="metric-value">
                    {peakInstantIso
                      ? formatPresentationDateLong(peakInstantIso, calendarTimeZone)
                      : '—'}
                  </span>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="pk-warnings-container">
                  {warnings.map((code) => (
                    <div key={code} className="pk-warning-badge" role="status">
                      ⚠️ {formatPkWarning(code)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
