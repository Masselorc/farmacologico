import { messages } from '../../../app/i18n/pt-BR.messages'
import { MS_PER_DAY } from '../../../domain/units/convert'
import { formatDuration } from '../../../domain/units/format'
import type { ComparatorAnalyzedScenario } from '../lib/analysis'
import { getToneColorClass } from '../lib/colors'
import { formatPresentationNumber } from '../lib/presentation'

export interface ModelDetailsProps {
  analyzedScenarios: ReadonlyArray<ComparatorAnalyzedScenario>
}

export function ModelDetails({ analyzedScenarios }: ModelDetailsProps) {
  if (analyzedScenarios.length === 0) return null

  return (
    <div className="model-details-container">
      <h3>{messages.comparator.modelDetailsTitle}</h3>

      {analyzedScenarios.map((item) => {
        const { scenario, result } = item
        const { metadata } = result

        // Conversão de taxas para /dia
        const kePerDay = metadata.kePerMs * MS_PER_DAY
        const kaPerDay = metadata.kaPerMs !== null ? metadata.kaPerMs * MS_PER_DAY : null

        return (
          <div key={scenario.id} className="model-details-card">
            <h4 className={`scenario-title ${getToneColorClass(scenario.color)}`}>
              {scenario.name}
            </h4>

            <div className="model-parameters-grid">
              <div className="param-item">
                <span className="param-label">{messages.comparator.modelHalfLife}:</span>
                <span className="param-value">
                  {formatDuration(scenario.selectedPkParameters.halfLifeMs)}
                </span>
              </div>

              <div className="param-item">
                <span className="param-label">{messages.comparator.modelTmax}:</span>
                <span className="param-value">
                  {scenario.selectedPkParameters.tmaxMs !== null
                    ? formatDuration(scenario.selectedPkParameters.tmaxMs)
                    : messages.comparator.tmaxImmediate}
                </span>
              </div>

              <div className="param-item">
                <span className="param-label">{messages.comparator.modelKe}:</span>
                <span className="param-value">
                  {formatPresentationNumber(kePerDay, 4)} / dia
                </span>
              </div>

              <div className="param-item">
                <span className="param-label">{messages.comparator.modelKa}:</span>
                <span className="param-value">
                  {kaPerDay !== null ? `${formatPresentationNumber(kaPerDay, 4)} / dia` : '—'}
                </span>
              </div>

              <div className="param-item">
                <span className="param-label">{messages.comparator.modelTerminalHalfLife}:</span>
                <span className="param-value">
                  {formatDuration(metadata.terminalHalfLifeMs)}
                </span>
              </div>

              <div className="param-item">
                <span className="param-label">{messages.comparator.modelCutoff}:</span>
                <span className="param-value">
                  {formatDuration(metadata.contributionCutoffAgeMs)}
                </span>
              </div>

              <div className="param-item">
                <span className="param-label">{messages.comparator.modelEngineVersion}:</span>
                <span className="param-value">{metadata.pkEngineVersion}</span>
              </div>
            </div>
          </div>
        )
      })}

      <div className="educational-disclaimer" role="note">
        <p>{messages.comparator.modelEducationalDisclaimer}</p>
      </div>
    </div>
  )
}
