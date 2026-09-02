import { useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import type { Scenario } from '../../../domain/types'
import { getToneBgClass } from '../lib/colors'

export interface ScenarioListProps {
  scenarios: ReadonlyArray<Scenario>
  activeScenarioId: string | null
  onSelectScenario: (scenarioId: string) => void
  onEditScenario: (scenario: Scenario) => void
  onDeleteScenario: (scenarioId: string) => Promise<{ ok: boolean; error?: string }>
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
  const [deletingScenarioId, setDeletingScenarioId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async (scenarioId: string) => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const result = await onDeleteScenario(scenarioId)
      if (!result || result.ok) {
        setDeletingScenarioId(null)
      } else {
        setDeleteError(result.error ?? messages.comparator.deleteScenarioError)
      }
    } finally {
      setIsDeleting(false)
    }
  }

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
            >
              <div
                className="scenario-card-header clickable"
                role="button"
                tabIndex={0}
                onClick={() => onSelectScenario(scenario.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectScenario(scenario.id)
                  }
                }}
              >
                <span
                  className={`scenario-color-badge ${getToneBgClass(scenario.color)}`}
                  aria-hidden="true"
                />
                <span className="scenario-name">{scenario.name}</span>
                <span className="scenario-badge">
                  {messages.comparator.dosesCount(scenario.doses.length)}
                </span>
              </div>

              {deletingScenarioId === scenario.id ? (
                <div
                  className="scenario-delete-confirm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {deleteError && (
                    <div className="error-box text-danger" role="alert">
                      <p>{deleteError}</p>
                    </div>
                  )}
                  <span>{messages.comparator.deleteScenarioConfirm}</span>
                  <button
                    type="button"
                    className="btn-link text-danger btn-sm"
                    disabled={isDeleting}
                    onClick={() => handleConfirmDelete(scenario.id)}
                  >
                    {messages.comparator.confirmDelete}
                  </button>
                  <button
                    type="button"
                    className="btn-link btn-sm"
                    disabled={isDeleting}
                    onClick={() => {
                      setDeletingScenarioId(null)
                      setDeleteError(null)
                    }}
                  >
                    {messages.comparator.cancel}
                  </button>
                </div>
              ) : (
                <div className="scenario-card-actions">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditScenario(scenario)
                    }}
                  >
                    {messages.comparator.edit}
                  </button>
                  <button
                    type="button"
                    className="btn-link text-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingScenarioId(scenario.id)
                      setDeleteError(null)
                    }}
                  >
                    {messages.comparator.remove}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
