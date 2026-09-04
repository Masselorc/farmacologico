import { useEffect, useRef, useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { DEFAULT_SCENARIO_COLORS } from '../../../domain/shared/colors'
import { parseLocaleDecimal } from '../../../domain/units/decimal'
import { formatPresentationNumber } from '../../comparator/lib/presentation'
import {
  createEmptyProtocolDraft,
  draftToProtocol,
  protocolToDraft,
  type ProtocolComponentDraft,
  type ProtocolDraft,
} from '../lib/drafts'
import type { IsoWeekday, Protocol, TimeZoneId } from '../../../domain/types'

export interface ProtocolDialogProps {
  isOpen: boolean
  initialProtocol?: Protocol
  calendarTimeZone: TimeZoneId
  onSave: (protocol: Protocol) => void
  onCancel: () => void
}

const ISO_WEEKDAYS: Array<{ day: IsoWeekday; label: string }> = [
  { day: 1, label: 'Seg' },
  { day: 2, label: 'Ter' },
  { day: 3, label: 'Qua' },
  { day: 4, label: 'Qui' },
  { day: 5, label: 'Sex' },
  { day: 6, label: 'Sáb' },
  { day: 7, label: 'Dom' },
]

const TIME_ZONES: TimeZoneId[] = [
  'America/Sao_Paulo',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
]

export function ProtocolDialog({
  isOpen,
  initialProtocol,
  calendarTimeZone,
  onSave,
  onCancel,
}: ProtocolDialogProps) {
  const [draft, setDraft] = useState<ProtocolDraft>(() =>
    initialProtocol
      ? protocolToDraft(initialProtocol)
      : createEmptyProtocolDraft(calendarTimeZone),
  )
  const [errors, setErrors] = useState<string[]>([])
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  if (!isOpen) {
    return null
  }

  const handleWeekdayToggle = (day: IsoWeekday) => {
    setDraft((prev) => {
      const exists = prev.weekdays.includes(day)
      const nextWeekdays = exists
        ? prev.weekdays.filter((d) => d !== day)
        : [...prev.weekdays, day]
      return { ...prev, weekdays: nextWeekdays }
    })
  }

  const handleComponentChange = <K extends keyof ProtocolComponentDraft>(
    index: number,
    field: K,
    value: ProtocolComponentDraft[K],
  ) => {
    setDraft((prev) => {
      const nextComps = [...prev.components]
      const current = nextComps[index]
      if (!current) return prev
      nextComps[index] = { ...current, [field]: value }
      return { ...prev, components: nextComps }
    })
  }

  const handleAddComponent = () => {
    setDraft((prev) => {
      const nextColor =
        DEFAULT_SCENARIO_COLORS[
          prev.components.length % DEFAULT_SCENARIO_COLORS.length
        ]!
      const newComp: ProtocolComponentDraft = {
        id: crypto.randomUUID(),
        label: `Componente ${prev.components.length + 1}`,
        proportion: '1',
        source: { type: 'manual' },
        halfLifeDays: '6',
        tmaxDays: '2',
        displayColor: { paletteColor: nextColor },
      }
      return { ...prev, components: [...prev.components, newComp] }
    })
  }

  const handleRemoveComponent = (index: number) => {
    if (draft.components.length <= 1) return
    setDraft((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    const result = draftToProtocol(draft, initialProtocol)
    if (!result.ok) {
      setErrors(result.error)
      return
    }

    onSave(result.value)
  }

  return (
    <div className="protocol-modal-backdrop" onClick={onCancel}>
      <div
        className="protocol-modal-dialog protocol-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="protocol-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="protocol-modal-header">
          <h3 id="protocol-dialog-title" className="protocol-modal-title">
            {initialProtocol
              ? messages.protocols.editProtocol
              : messages.protocols.newProtocol}
          </h3>
          <button
            type="button"
            className="protocol-btn-icon"
            onClick={onCancel}
            aria-label={messages.protocols.cancel}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="protocol-form">
          {errors.length > 0 && (
            <div className="protocol-errors-box" role="alert">
              <strong>{messages.comparator.reviewDataTitle}</strong>
              <ul>
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="protocol-form-section">
            <div className="protocol-form-group">
              <label htmlFor="protocol-name">
                {messages.protocols.formName} *
              </label>
              <input
                id="protocol-name"
                ref={nameInputRef}
                type="text"
                required
                maxLength={100}
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Ciclo Enantato Semanal"
              />
            </div>

            <div className="protocol-form-group">
              <label htmlFor="protocol-dose">
                {messages.protocols.formTotalDose} *
              </label>
              <input
                id="protocol-dose"
                type="text"
                inputMode="decimal"
                required
                value={draft.totalDoseMg}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, totalDoseMg: e.target.value }))
                }
                placeholder="Ex: 250"
              />
            </div>

            <div className="protocol-form-row">
              <div className="protocol-form-group">
                <label htmlFor="protocol-date">
                  {messages.protocols.formStartDate} *
                </label>
                <input
                  id="protocol-date"
                  type="date"
                  required
                  value={draft.startDate}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>

              <div className="protocol-form-group">
                <label htmlFor="protocol-time">
                  {messages.protocols.formTime} *
                </label>
                <input
                  id="protocol-time"
                  type="time"
                  required
                  value={draft.localTime}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, localTime: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="protocol-form-group">
              <label htmlFor="protocol-tz">
                {messages.protocols.formTimeZone}
              </label>
              <select
                id="protocol-tz"
                value={draft.timeZone}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    timeZone: e.target.value as TimeZoneId,
                  }))
                }
              >
                {TIME_ZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="protocol-form-section">
            <h4 className="protocol-section-subtitle">
              {messages.protocols.formRecurrenceType}
            </h4>

            <div className="protocol-recurrence-toggle">
              <label className="protocol-radio-label">
                <input
                  type="radio"
                  name="recurrenceType"
                  value="single"
                  checked={draft.recurrenceType === 'single'}
                  onChange={() =>
                    setDraft((prev) => ({ ...prev, recurrenceType: 'single' }))
                  }
                />
                {messages.protocols.recurrenceSingle}
              </label>

              <label className="protocol-radio-label">
                <input
                  type="radio"
                  name="recurrenceType"
                  value="weekly"
                  checked={draft.recurrenceType === 'weekly'}
                  onChange={() =>
                    setDraft((prev) => ({ ...prev, recurrenceType: 'weekly' }))
                  }
                />
                {messages.protocols.recurrenceWeekly}
              </label>
            </div>

            {draft.recurrenceType === 'weekly' && (
              <div className="protocol-weekly-options">
                <div className="protocol-form-group">
                  <label>{messages.protocols.formWeekdays}</label>
                  <div className="protocol-weekdays-selector">
                    {ISO_WEEKDAYS.map(({ day, label }) => {
                      const isSelected = draft.weekdays.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`protocol-weekday-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleWeekdayToggle(day)}
                          aria-pressed={isSelected}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="protocol-form-group">
                  <label htmlFor="protocol-weeks">
                    {messages.protocols.formWeeks}
                  </label>
                  <input
                    id="protocol-weeks"
                    type="number"
                    min={1}
                    max={520}
                    value={draft.weeks}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, weeks: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="protocol-form-section">
            <div className="protocol-section-header">
              <h4 className="protocol-section-subtitle">
                {messages.protocols.componentsTitle}
              </h4>
              <button
                type="button"
                className="protocol-btn protocol-btn-sm"
                onClick={handleAddComponent}
              >
                {messages.protocols.addComponent}
              </button>
            </div>

            <div className="protocol-components-list">
              {draft.components.map((comp, idx) => {
                const hlNum = parseLocaleDecimal(comp.halfLifeDays)
                const hlHours = hlNum.ok
                  ? formatPresentationNumber(hlNum.value * 24, 1)
                  : null

                const tmaxNum = parseLocaleDecimal(comp.tmaxDays)
                const tmaxHours = tmaxNum.ok
                  ? formatPresentationNumber(tmaxNum.value * 24, 1)
                  : null

                return (
                  <div key={comp.id} className="protocol-component-item">
                    <div className="component-item-header">
                      <strong>
                        {messages.protocols.componentLabel} {idx + 1}
                      </strong>
                      {draft.components.length > 1 && (
                        <button
                          type="button"
                          className="protocol-btn-icon text-danger"
                          onClick={() => handleRemoveComponent(idx)}
                          aria-label={messages.protocols.removeComponent}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="protocol-form-row">
                      <div className="protocol-form-group">
                        <label>
                          {messages.protocols.componentLabel}
                        </label>
                        <input
                          type="text"
                          required
                          value={comp.label}
                          onChange={(e) =>
                            handleComponentChange(idx, 'label', e.target.value)
                          }
                        />
                      </div>

                      <div className="protocol-form-group">
                        <label>
                          {messages.protocols.componentProportion}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          value={comp.proportion}
                          onChange={(e) =>
                            handleComponentChange(
                              idx,
                              'proportion',
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="protocol-form-row">
                      <div className="protocol-form-group">
                        <label>
                          {messages.protocols.componentHalfLifeDays}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          value={comp.halfLifeDays}
                          onChange={(e) =>
                            handleComponentChange(
                              idx,
                              'halfLifeDays',
                              e.target.value,
                            )
                          }
                        />
                        <span className="protocol-helper-text">
                          {messages.protocols.halfLifeHelper}
                          {hlHours && ` ${messages.protocols.equivalenceHelper(hlHours)}`}
                        </span>
                      </div>

                      <div className="protocol-form-group">
                        <label>
                          {messages.protocols.componentTmaxDays}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          value={comp.tmaxDays}
                          onChange={(e) =>
                            handleComponentChange(
                              idx,
                              'tmaxDays',
                              e.target.value,
                            )
                          }
                        />
                        <span className="protocol-helper-text">
                          {messages.protocols.tmaxHelper}
                          {tmaxHours && ` ${messages.protocols.equivalenceHelper(tmaxHours)}`}
                        </span>
                      </div>
                    </div>

                    <div className="protocol-form-group">
                      <label>{messages.protocols.componentColor}</label>
                      <div className="protocol-color-palette">
                        {DEFAULT_SCENARIO_COLORS.map((c) => {
                          const isSelected =
                            comp.displayColor.paletteColor === c
                          return (
                            <button
                              key={c}
                              type="button"
                              data-color={c}
                              className={`protocol-color-swatch ${isSelected ? 'selected' : ''}`}
                              onClick={() =>
                                handleComponentChange(idx, 'displayColor', {
                                  paletteColor: c,
                                })
                              }
                              aria-label={`Cor ${c}`}
                              aria-pressed={isSelected}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="protocol-modal-actions">
            <button
              type="button"
              className="protocol-btn protocol-btn-secondary"
              onClick={onCancel}
            >
              {messages.protocols.cancel}
            </button>
            <button type="submit" className="protocol-btn protocol-btn-primary">
              {initialProtocol
                ? messages.protocols.save
                : messages.protocols.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
