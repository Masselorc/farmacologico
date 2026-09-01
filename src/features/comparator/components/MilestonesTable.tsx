import { Temporal } from '@js-temporal/polyfill'
import { messages } from '../../../app/i18n/pt-BR.messages'
import type { TimeZoneId } from '../../../domain/types'
import type { ComparatorAnalyzedScenario } from '../lib/analysis'
import {
  formatPresentationDateLong,
  formatPresentationMass,
} from '../lib/presentation'

export interface MilestonesTableProps {
  analyzedScenarios: ReadonlyArray<ComparatorAnalyzedScenario>
  calendarTimeZone: TimeZoneId
}

export function MilestonesTable({
  analyzedScenarios,
  calendarTimeZone,
}: MilestonesTableProps) {
  if (analyzedScenarios.length === 0) return null

  return (
    <div className="milestones-table-container">
      <h3>{messages.comparator.milestonesTitle}</h3>

      {analyzedScenarios.map((item) => {
        const { scenario, result } = item
        const { milestones } = result

        return (
          <div key={scenario.id} className="scenario-milestones-wrapper">
            <h4 className="scenario-title" style={{ color: scenario.color }}>
              {scenario.name}
            </h4>

            <table className="milestones-table">
              <thead>
                <tr>
                  <th>{messages.comparator.milestonePercentage}</th>
                  <th>{messages.comparator.milestoneTarget}</th>
                  <th>{messages.comparator.milestoneTime} ({calendarTimeZone})</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m) => {
                  let timeDisplay: string = messages.comparator.milestoneNotReached
                  if (m.timeMs !== null && Number.isFinite(m.timeMs)) {
                    try {
                      const instantIso = Temporal.Instant.fromEpochMilliseconds(m.timeMs).toString()
                      timeDisplay = formatPresentationDateLong(instantIso, calendarTimeZone)
                    } catch {
                      timeDisplay = messages.comparator.milestoneNotReached
                    }
                  }

                  return (
                    <tr key={m.percentage}>
                      <td>{String(m.percentage).replace('.', ',')}%</td>
                      <td>{formatPresentationMass(m.targetMg, scenario.displayUnit)}</td>
                      <td className={m.timeMs === null ? 'text-muted' : ''}>
                        {timeDisplay}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
