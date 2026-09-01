import { useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { SAFETY_LIMITS } from '../../../validation/limits'
import type { Dose, LocalDate, LocalTime, Scenario, TimeZoneId } from '../../../domain/types'
import { buildDoseFromDraft, type DoseInputDraft } from '../lib/form'
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
  const [draft, setDraft] = useState<DoseInputDraft>({
    id: '',
    amountText: '',
    localDate: '' as LocalDate,
    localTime: '' as LocalTime,
  })
  const [errors, setErrors] = useState<string[]>([])

  const canAddMore = scenario.doses.length < SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX

  const handleAddDose = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAddMore) {
      setErrors([messages.comparator.dosesMaxReached(SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX)])
      return
    }

    const result = buildDoseFromDraft(draft, scenario.displayUnit, calendarTimeZone)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    setErrors([])
    onUpdateDoses([...scenario.doses, result.dose])
    setDraft({
      id: '',
      amountText: '',
      localDate: draft.localDate,
      localTime: draft.localTime,
    })
  }

  const handleRemoveDose = (doseId: string) => {
    onUpdateDoses(scenario.doses.filter((d) => d.id !== doseId))
  }

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

      {canAddMore ? (
        <form className="dose-form" onSubmit={handleAddDose}>
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
            <button type="submit" className="btn btn-primary btn-sm">
              + {messages.comparator.addDose}
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
                <th>#</th>
                <th>Dose</th>
                <th>Data/Hora ({calendarTimeZone})</th>
                <th>Ações</th>
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
