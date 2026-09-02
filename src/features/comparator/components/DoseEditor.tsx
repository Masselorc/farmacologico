import { useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { SAFETY_LIMITS } from '../../../validation/limits'
import type { Dose, LocalDate, LocalTime, Scenario, TimeZoneId } from '../../../domain/types'
import { buildDoseFromDraft, doseToDraft, type DoseInputDraft } from '../lib/form'
import { formatPresentationDateShort, formatPresentationMass } from '../lib/presentation'
import { QuickDose } from './QuickDose'

export interface DoseEditorProps {
  scenario: Scenario
  calendarTimeZone: TimeZoneId
  onUpdateDoses: (doses: Dose[]) => void
}

export function DoseEditor({
  scenario,
  calendarTimeZone,
  onUpdateDoses,
}: DoseEditorProps) {
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DoseInputDraft>({
    id: '',
    amountText: '',
    localDate: '' as LocalDate,
    localTime: '' as LocalTime,
  })
  const [errors, setErrors] = useState<string[]>([])

  const canAddMore = scenario.doses.length < SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX

  const handleStartEdit = (dose: Dose) => {
    const dDraft = doseToDraft(dose, scenario.displayUnit, calendarTimeZone)
    setDraft(dDraft)
    setEditingDoseId(dose.id)
    setErrors([])
  }

  const handleCancelEdit = () => {
    setEditingDoseId(null)
    setDraft({
      id: '',
      amountText: '',
      localDate: '' as LocalDate,
      localTime: '' as LocalTime,
    })
    setErrors([])
  }

  const handleSubmitDose = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDoseId && !canAddMore) {
      setErrors([messages.comparator.dosesMaxReached(SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX)])
      return
    }

    const draftToBuild: DoseInputDraft = editingDoseId ? { ...draft, id: editingDoseId } : draft
    const result = buildDoseFromDraft(draftToBuild, scenario.displayUnit, calendarTimeZone)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    setErrors([])
    if (editingDoseId) {
      onUpdateDoses(scenario.doses.map((d) => (d.id === editingDoseId ? result.dose : d)))
      setEditingDoseId(null)
    } else {
      onUpdateDoses([...scenario.doses, result.dose])
    }

    setDraft({
      id: '',
      amountText: '',
      localDate: draft.localDate,
      localTime: draft.localTime,
    })
  }

  const handleRemoveDose = (doseId: string) => {
    if (editingDoseId === doseId) {
      handleCancelEdit()
    }
    onUpdateDoses(scenario.doses.filter((d) => d.id !== doseId))
  }

  const editingIndex = editingDoseId ? scenario.doses.findIndex((d) => d.id === editingDoseId) : -1

  return (
    <div className="dose-editor-container">
      <h4>{messages.comparator.dosesTitle} ({scenario.name})</h4>

      {errors.length > 0 && (
        <div className="error-box" role="alert">
          <ul>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {editingIndex >= 0 && (
        <p className="dose-edit-indicator">
          {messages.comparator.editingDoseIndicator(editingIndex + 1)}
        </p>
      )}

      {editingDoseId || canAddMore ? (
        <form className="dose-form" onSubmit={handleSubmitDose}>
          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="dose-amount">
                {messages.comparator.doseAmountLabel} ({scenario.displayUnit})
              </label>
              <input
                id="dose-amount"
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 10"
                value={draft.amountText}
                onChange={(e) => setDraft((d) => ({ ...d, amountText: e.target.value }))}
                required
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="dose-date">{messages.comparator.doseDateLabel}</label>
              <input
                id="dose-date"
                type="date"
                value={draft.localDate}
                onChange={(e) => setDraft((d) => ({ ...d, localDate: e.target.value as LocalDate }))}
                required
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="dose-time">{messages.comparator.doseTimeLabel}</label>
              <input
                id="dose-time"
                type="time"
                value={draft.localTime}
                onChange={(e) => setDraft((d) => ({ ...d, localTime: e.target.value as LocalTime }))}
                required
              />
            </div>
          </div>

          <div className="dose-form-actions">
            <QuickDose
              calendarTimeZone={calendarTimeZone}
              onSelectCurrentDateTime={({ localDate, localTime }) =>
                setDraft((d) => ({ ...d, localDate, localTime }))
              }
            />
            {editingDoseId && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCancelEdit}
              >
                {messages.comparator.cancel}
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-sm">
              {editingDoseId ? messages.comparator.saveDose : `+ ${messages.comparator.addDose}`}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-warning">
          {messages.comparator.dosesMaxReached(SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX)}
        </p>
      )}

      {scenario.doses.length === 0 ? (
        <p className="empty-notice">{messages.comparator.noDoses}</p>
      ) : (
        <div className="doses-table-wrapper">
          <table className="doses-table">
            <thead>
              <tr>
                <th>{messages.comparator.doseNumberHeader}</th>
                <th>{messages.comparator.doseAmountHeader}</th>
                <th>{messages.comparator.doseDateTimeHeader(calendarTimeZone)}</th>
                <th>{messages.comparator.doseActionsHeader}</th>
              </tr>
            </thead>
            <tbody>
              {scenario.doses.map((dose, idx) => (
                <tr key={dose.id}>
                  <td>{idx + 1}</td>
                  <td>{formatPresentationMass(dose.amountMg, scenario.displayUnit)}</td>
                  <td>{formatPresentationDateShort(dose.time, calendarTimeZone)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-link btn-sm"
                      onClick={() => handleStartEdit(dose)}
                    >
                      {messages.comparator.edit}
                    </button>
                    <button
                      type="button"
                      className="btn-link text-danger btn-sm"
                      onClick={() => handleRemoveDose(dose.id)}
                    >
                      {messages.comparator.removeDose}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
