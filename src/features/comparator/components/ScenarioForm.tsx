import { useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { UX_LIMITS } from '../../../validation/limits'
import type { MassUnit, Scenario, TimeUnit } from '../../../domain/types'
import { DEFAULT_SCENARIO_COLORS } from '../lib/colors'
import {
  buildScenarioFromDraft,
  createEmptyScenarioDraft,
  scenarioToDraft,
  type ScenarioDraft,
} from '../lib/form'

export interface ScenarioFormProps {
  initialScenario?: Scenario
  scenariosCount: number
  onSave: (scenario: Scenario) => void
  onCancel: () => void
}

export function ScenarioForm({
  initialScenario,
  scenariosCount,
  onSave,
  onCancel,
}: ScenarioFormProps) {
  const [draft, setDraft] = useState<ScenarioDraft>(() =>
    initialScenario ? scenarioToDraft(initialScenario) : createEmptyScenarioDraft(scenariosCount),
  )
  const [errors, setErrors] = useState<string[]>([])

  const isLinked = draft.source.type === 'library' || draft.source.type === 'custom_profile'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = buildScenarioFromDraft(draft, initialScenario?.doses ?? [])
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    onSave(result.scenario)
  }

  return (
    <form className="scenario-form" onSubmit={handleSubmit}>
      <h3 className="form-title">
        {initialScenario ? messages.comparator.editScenarioTitle : messages.comparator.newScenarioTitle}
      </h3>

      {errors.length > 0 && (
        <div className="error-box" role="alert">
          <p className="error-title">{messages.comparator.reviewDataTitle}</p>
          <ul>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="scenario-name">{messages.comparator.scenarioNameLabel}</label>
        <input
          id="scenario-name"
          type="text"
          maxLength={UX_LIMITS.NAME_MAX_CHARS}
          placeholder={messages.comparator.scenarioNamePlaceholder}
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="scenario-color">{messages.comparator.scenarioColorLabel}</label>
        <select
          id="scenario-color"
          value={draft.color}
          onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
        >
          {DEFAULT_SCENARIO_COLORS.map((color, idx) => (
            <option key={color} value={color}>
              {messages.comparator.colorOptionLabel(idx + 1, color)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group flex-1">
          <label htmlFor="scenario-halflife">{messages.comparator.halfLifeLabel}</label>
          <input
            id="scenario-halflife"
            type="text"
            inputMode="decimal"
            disabled={isLinked}
            value={draft.halfLifeText}
            onChange={(e) => setDraft((d) => ({ ...d, halfLifeText: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="scenario-halflife-unit">{messages.comparator.halfLifeUnitLabel}</label>
          <select
            id="scenario-halflife-unit"
            disabled={isLinked}
            value={draft.halfLifeUnit}
            onChange={(e) => setDraft((d) => ({ ...d, halfLifeUnit: e.target.value as TimeUnit }))}
          >
            <option value="minutes">{messages.comparator.timeUnitMinutes}</option>
            <option value="hours">{messages.comparator.timeUnitHours}</option>
            <option value="days">{messages.comparator.timeUnitDays}</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group flex-1">
          <label htmlFor="scenario-tmax">{messages.comparator.tmaxLabel}</label>
          <input
            id="scenario-tmax"
            type="text"
            inputMode="decimal"
            disabled={isLinked}
            value={draft.tmaxText}
            onChange={(e) => setDraft((d) => ({ ...d, tmaxText: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="scenario-tmax-unit">{messages.comparator.tmaxUnitLabel}</label>
          <select
            id="scenario-tmax-unit"
            disabled={isLinked}
            value={draft.tmaxUnit}
            onChange={(e) => setDraft((d) => ({ ...d, tmaxUnit: e.target.value as TimeUnit }))}
          >
            <option value="minutes">{messages.comparator.timeUnitMinutes}</option>
            <option value="hours">{messages.comparator.timeUnitHours}</option>
            <option value="days">{messages.comparator.timeUnitDays}</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="scenario-display-unit">{messages.comparator.displayUnitLabel}</label>
        <select
          id="scenario-display-unit"
          value={draft.displayUnit}
          onChange={(e) => setDraft((d) => ({ ...d, displayUnit: e.target.value as MassUnit }))}
        >
          <option value="mcg">{messages.comparator.massUnitMcg}</option>
          <option value="mg">{messages.comparator.massUnitMg}</option>
          <option value="g">{messages.comparator.massUnitG}</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {messages.comparator.saveScenario}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {messages.comparator.cancel}
        </button>
      </div>
    </form>
  )
}
