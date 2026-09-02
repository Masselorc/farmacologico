import { useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { SAFETY_LIMITS } from '../../../validation/limits'
import type { Dose, Scenario, TimeZoneId } from '../../../domain/types'
import { DoseEditor } from '../components/DoseEditor'
import { ScenarioForm } from '../components/ScenarioForm'
import { ScenarioList } from '../components/ScenarioList'

export interface EditPageProps {
  scenarios: Scenario[]
  calendarTimeZone: TimeZoneId
  onUpdateScenarios: (scenarios: Scenario[]) => Promise<{ ok: boolean; error?: string }>
}

export function EditPage({
  scenarios,
  calendarTimeZone,
  onUpdateScenarios,
}: EditPageProps) {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(
    scenarios.length > 0 ? scenarios[0].id : null,
  )
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || null
  const canAddMore = scenarios.length < SAFETY_LIMITS.SCENARIOS_MAX

  const handleSaveScenario = async (savedScenario: Scenario) => {
    const exists = scenarios.some((s) => s.id === savedScenario.id)
    const candidate = exists
      ? scenarios.map((s) => (s.id === savedScenario.id ? savedScenario : s))
      : [...scenarios, savedScenario]

    const result = await onUpdateScenarios(candidate)
    if (!result.ok) {
      setPageError(result.error ?? messages.comparator.saveScenarioError)
      return
    }

    setPageError(null)
    setActiveScenarioId(savedScenario.id)
    setEditingScenario(null)
    setIsCreating(false)
  }

  const handleDeleteScenario = async (scenarioId: string): Promise<{ ok: boolean; error?: string }> => {
    const updated = scenarios.filter((s) => s.id !== scenarioId)
    const result = await onUpdateScenarios(updated)
    if (!result.ok) {
      setPageError(result.error ?? messages.comparator.deleteScenarioError)
      return result
    }

    setPageError(null)
    if (activeScenarioId === scenarioId) {
      setActiveScenarioId(updated.length > 0 ? updated[0].id : null)
    }
    return { ok: true }
  }

  const handleUpdateDoses = async (doses: Dose[]): Promise<{ ok: boolean; error?: string }> => {
    if (!activeScenario) return { ok: false, error: messages.comparator.updateDosesError }
    const updatedScenario: Scenario = {
      ...activeScenario,
      doses,
    }
    const candidate = scenarios.map((s) => (s.id === activeScenario.id ? updatedScenario : s))
    const result = await onUpdateScenarios(candidate)
    if (!result.ok) {
      setPageError(result.error ?? messages.comparator.updateDosesError)
      return result
    }
    setPageError(null)
    return { ok: true }
  }

  return (
    <div className="comparator-edit-panel">
      {pageError && (
        <div className="comparator-errors-box" role="alert">
          <p>{pageError}</p>
        </div>
      )}
      {isCreating || editingScenario ? (
        <ScenarioForm
          initialScenario={editingScenario ?? undefined}
          scenariosCount={scenarios.length}
          onSave={handleSaveScenario}
          onCancel={() => {
            setIsCreating(false)
            setEditingScenario(null)
          }}
        />
      ) : (
        <>
          <ScenarioList
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelectScenario={setActiveScenarioId}
            onEditScenario={(s) => setEditingScenario(s)}
            onDeleteScenario={handleDeleteScenario}
            onAddNewScenario={() => setIsCreating(true)}
            canAddScenario={canAddMore}
          />

          {activeScenario && (
            <DoseEditor
              scenario={activeScenario}
              calendarTimeZone={calendarTimeZone}
              onUpdateDoses={handleUpdateDoses}
            />
          )}
        </>
      )}
    </div>
  )
}
