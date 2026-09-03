import { useState } from 'react'
import { formatDuration, messages } from '../../../app/i18n/pt-BR.messages'
import type { DurationRange, DurationValue, TimeUnit } from '../../../domain/shared/types.datetime'
import { normalizeDurationRange, toMilliseconds } from '../../../domain/units/convert'
import { parseLocaleDecimal } from '../../../domain/units/decimal'

export interface RangeSelectorProps {
  label: string
  range: DurationRange
  value?: DurationValue
  onChange: (value: DurationValue | undefined) => void
}

export function RangeSelector({ label, range, value, onChange }: RangeSelectorProps) {
  const norm = normalizeDurationRange(range)
  const [text, setText] = useState(value ? String(value.value) : '')
  const [unit, setUnit] = useState<TimeUnit>(value?.unit ?? range.min.unit)
  const [error, setError] = useState<string | null>(null)

  function handleBlur() {
    if (!text.trim()) {
      setError(messages.library.enterValue)
      onChange(undefined)
      return
    }
    const res = parseLocaleDecimal(text)
    if (!res.ok || !Number.isFinite(res.value) || res.value <= 0) {
      setError(messages.library.invalidNumber)
      onChange(undefined)
      return
    }

    const num = res.value
    const ms = toMilliseconds(num, unit)
    if (ms < norm.minMs || ms > norm.maxMs) {
      setError(messages.library.valueMustBeBetween(formatDuration(range.min), formatDuration(range.max)))
      onChange(undefined)
      return
    }

    setError(null)
    onChange({ value: num, unit })
  }

  return (
    <div className="range-selector">
      <label className="range-label">{label}</label>
      <div className="range-bounds-text">
        {messages.library.rangeAllowed(formatDuration(range.min), formatDuration(range.max))}
      </div>
      <div className="range-inputs-row">
        <input
          type="text"
          inputMode="decimal"
          className="range-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
            onChange(undefined)
          }}
          onBlur={handleBlur}
          aria-label={label}
        />
        <select
          className="range-unit-select"
          value={unit}
          onChange={(e) => {
            const nextUnit = e.target.value as TimeUnit
            setUnit(nextUnit)
            if (text.trim()) {
              const res = parseLocaleDecimal(text)
              if (res.ok && Number.isFinite(res.value) && res.value > 0) {
                const num = res.value
                const ms = toMilliseconds(num, nextUnit)
                if (ms >= norm.minMs && ms <= norm.maxMs) {
                  setError(null)
                  onChange({ value: num, unit: nextUnit })
                  return
                }
              }
            }
            onChange(undefined)
          }}
        >
          <option value="minutes">{messages.comparator.timeUnitMinutes}</option>
          <option value="hours">{messages.comparator.timeUnitHours}</option>
          <option value="days">{messages.comparator.timeUnitDays}</option>
        </select>
      </div>
      {error && (
        <span className="range-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
