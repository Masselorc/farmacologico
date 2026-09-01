import { messages } from '../../../app/i18n/pt-BR.messages'
import type { Scenario } from '../../../domain/types'

export interface ScenarioListProps {
  scenarios: ReadonlyArray<Scenario>
  activeScenarioId: string | null
  onSelectScenario: (scenarioId: string) => void
  onEditScenario: (scenario: Scenario) => void
  onDeleteScenario: (scenarioId: string) => void
  onAddNewScenario: () => void
  canAddScenario: boolean
}

export function ScenarioList({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onEditScenario,
  onDeleteScenario,
  onAddNewScenario,
  canAddScenario,
}: ScenarioListProps) {
  return (
    <div className="scenario-list-container">
      <div className="scenario-list-header">
        <h3>{messages.comparator.scenariosSectionTitle} ({scenarios.length})</h3>
        {canAddScenario && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onAddNewScenario}
          >
            + {messages.comparator.addScenario}
          </button>
        )}
      </div>

      <div className="scenario-items">
        {scenarios.map((scenario) => {
          const isActive = scenario.id === activeScenarioId
          return (
            <div
              key={scenario.id}
              className={`scenario-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectScenario(scenario.id)}
            >
              <div className="scenario-card-header">
                <span
                  className="scenario-color-badge"
                  style={{ backgroundColor: scenario.color }}
                  aria-hidden="true"
                />
                <span className="scenario-name">{scenario.name}</span>
                <span className="scenario-badge">{scenario.doses.length} doses</span>
              </div>

              <div className="scenario-card-actions">
                <button
                  type="button"
                  className="btn-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditScenario(scenario)
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-link text-danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteScenario(scenario.id)
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
