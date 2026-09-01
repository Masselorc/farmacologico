import { useState } from 'react'
import { SAFETY_LIMITS } from '../../../validation/limits'
import type { Dose, Scenario, TimeZoneId } from '../../../domain/types'
import { DoseEditor } from '../components/DoseEditor'
import { ScenarioForm } from '../components/ScenarioForm'
import { ScenarioList } from '../components/ScenarioList'

export interface EditPageProps {
  scenarios: Scenario[]
  calendarTimeZone: TimeZoneId
  onUpdateScenarios: (scenarios: Scenario[]) => void
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

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || null
  const canAddMore = scenarios.length < SAFETY_LIMITS.SCENARIOS_MAX

  const handleSaveScenario = (savedScenario: Scenario) => {
    const exists = scenarios.some((s) => s.id === savedScenario.id)
    if (exists) {
      onUpdateScenarios(scenarios.map((s) => (s.id === savedScenario.id ? savedScenario : s)))
    } else {
      onUpdateScenarios([...scenarios, savedScenario])
    }
    setActiveScenarioId(savedScenario.id)
    setEditingScenario(null)
    setIsCreating(false)
  }

  const handleDeleteScenario = (scenarioId: string) => {
    const updated = scenarios.filter((s) => s.id !== scenarioId)
    onUpdateScenarios(updated)
    if (activeScenarioId === scenarioId) {
      setActiveScenarioId(updated.length > 0 ? updated[0].id : null)
    }
  }

  const handleUpdateDoses = (doses: Dose[]) => {
    if (!activeScenario) return
    const updatedScenario: Scenario = {
      ...activeScenario,
      doses,
    }
    onUpdateScenarios(scenarios.map((s) => (s.id === activeScenario.id ? updatedScenario : s)))
  }

  return (
    <div className="comparator-edit-panel">
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
