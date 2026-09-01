import { Temporal } from '@js-temporal/polyfill'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { civilToInstantIso, instantToZonedParts } from '../../../domain/shared/datetime'
import type {
  ChartScaleMode,
  ChartYAxisMode,
  DisplayWindow,
  LocalDate,
  TimeZoneId,
} from '../../../domain/types'
import { CompareChart } from '../../charts/CompareChart'
import { MetricsPanel } from '../components/MetricsPanel'
import { MilestonesTable } from '../components/MilestonesTable'
import { ModelDetails } from '../components/ModelDetails'
import { SaveAnalysisButton } from '../components/SaveAnalysisButton'
import type { ComparatorAnalyzedScenario } from '../lib/analysis'

export interface AnalysisPageProps {
  analyzedScenarios: ReadonlyArray<ComparatorAnalyzedScenario>
  nonContributingScenarios: ReadonlyArray<string>
  displayWindow: DisplayWindow
  calendarTimeZone: TimeZoneId
  scaleMode: ChartScaleMode
  yAxisMode: ChartYAxisMode
  onUpdateDisplayWindow: (window: DisplayWindow) => void
  onToggleScaleMode: (mode: ChartScaleMode) => void
  onToggleYAxisMode: (mode: ChartYAxisMode) => void
}

export function AnalysisPage({
  analyzedScenarios,
  nonContributingScenarios,
  displayWindow,
  calendarTimeZone,
  scaleMode,
  yAxisMode,
  onUpdateDisplayWindow,
  onToggleScaleMode,
  onToggleYAxisMode,
}: AnalysisPageProps) {
  const startInstantIso = Temporal.Instant.fromEpochMilliseconds(displayWindow.startMs).toString()
  const endInstantIso = Temporal.Instant.fromEpochMilliseconds(displayWindow.endMs).toString()

  const startParts = instantToZonedParts({ instantIso: startInstantIso, timeZone: calendarTimeZone })
  const endParts = instantToZonedParts({ instantIso: endInstantIso, timeZone: calendarTimeZone })

  const handleStartDateChange = (newDate: string) => {
    try {
      const iso = civilToInstantIso({
        localDate: newDate as LocalDate,
        localTime: startParts.localTime,
        timeZone: calendarTimeZone,
      })
      const startMs = Temporal.Instant.from(iso).epochMilliseconds
      if (startMs < displayWindow.endMs) {
        onUpdateDisplayWindow({ startMs, endMs: displayWindow.endMs })
      }
    } catch {
      // ignore invalid input
    }
  }

  const handleEndDateChange = (newDate: string) => {
    try {
      const iso = civilToInstantIso({
        localDate: newDate as LocalDate,
        localTime: endParts.localTime,
        timeZone: calendarTimeZone,
      })
      const endMs = Temporal.Instant.from(iso).epochMilliseconds
      if (endMs > displayWindow.startMs) {
        onUpdateDisplayWindow({ startMs: displayWindow.startMs, endMs })
      }
    } catch {
      // ignore invalid input
    }
  }

  return (
    <div className="comparator-analysis-panel">
      <div className="analysis-controls-bar">
        <div className="window-controls">
          <div className="control-group">
            <label htmlFor="window-start">{messages.comparator.windowStartLabel}</label>
            <input
              id="window-start"
              type="date"
              value={startParts.localDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>

          <div className="control-group">
            <label htmlFor="window-end">{messages.comparator.windowEndLabel}</label>
            <input
              id="window-end"
              type="date"
              value={endParts.localDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
            />
          </div>
        </div>

        <div className="toggles-controls">
          <div className="toggle-group">
            <span className="toggle-label">{messages.comparator.scaleToggleLabel}:</span>
            <div className="btn-group">
              <button
                type="button"
                className={`btn btn-sm ${scaleMode === 'absolute' ? 'btn-active' : ''}`}
                onClick={() => onToggleScaleMode('absolute')}
              >
                {messages.comparator.scaleAbsolute}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${scaleMode === 'normalized' ? 'btn-active' : ''}`}
                onClick={() => onToggleScaleMode('normalized')}
              >
                {messages.comparator.scaleNormalized}
              </button>
            </div>
          </div>

          <div className="toggle-group">
            <span className="toggle-label">{messages.comparator.yAxisToggleLabel}:</span>
            <div className="btn-group">
              <button
                type="button"
                className={`btn btn-sm ${yAxisMode === 'linear' ? 'btn-active' : ''}`}
                onClick={() => onToggleYAxisMode('linear')}
              >
                {messages.comparator.yAxisLinear}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${yAxisMode === 'log' ? 'btn-active' : ''}`}
                onClick={() => onToggleYAxisMode('log')}
              >
                {messages.comparator.yAxisLog}
              </button>
            </div>
          </div>
        </div>
      </div>

      {nonContributingScenarios.length > 0 && (
        <div className="comparator-notice no-contributing-notice" role="status">
          {nonContributingScenarios.map((name) => (
            <p key={name}>
              <strong>{name}</strong>: {messages.comparator.noContributingDoses}
            </p>
          ))}
        </div>
      )}

      {analyzedScenarios.length > 0 ? (
        <>
          <CompareChart
            analyzedScenarios={analyzedScenarios}
            calendarTimeZone={calendarTimeZone}
            scaleMode={scaleMode}
            yAxisMode={yAxisMode}
          />

          <div className="analysis-save-bar">
            <SaveAnalysisButton
              analyzedScenarios={analyzedScenarios}
              displayWindow={displayWindow}
              calendarTimeZone={calendarTimeZone}
              scaleMode={scaleMode}
              yAxisMode={yAxisMode}
            />
          </div>

          <MetricsPanel
            analyzedScenarios={analyzedScenarios}
            calendarTimeZone={calendarTimeZone}
          />

          <MilestonesTable
            analyzedScenarios={analyzedScenarios}
            calendarTimeZone={calendarTimeZone}
          />

          <ModelDetails analyzedScenarios={analyzedScenarios} />
        </>
      ) : (
        <div className="empty-analysis-state">
          <p>Nenhum cenário possui doses relevantes para a janela de visualização atual.</p>
        </div>
      )}
    </div>
  )
}
