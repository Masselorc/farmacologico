import { useEffect, useRef, useState } from 'react'
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

function durationRangeKey(range: DurationRange): string {
  return [range.min.value, range.min.unit, range.max.value, range.max.unit].join('|')
}

function durationValueKey(value: DurationValue | undefined): string {
  return value ? `${value.value}|${value.unit}` : 'none'
}

export function RangeSelector({ label, range, value, onChange }: RangeSelectorProps) {
  const norm = normalizeDurationRange(range)
  const rangeKey = durationRangeKey(range)
  const valueKey = durationValueKey(value)
  const propText = value ? String(value.value) : ''
  const propUnit = value?.unit ?? range.min.unit
  const [text, setText] = useState(propText)
  const [unit, setUnit] = useState<TimeUnit>(propUnit)
  const [error, setError] = useState<string | null>(null)
  const previousRangeKey = useRef(rangeKey)
  const previousValueKey = useRef(valueKey)
  const localEchoValueKey = useRef<string | null>(null)

  useEffect(() => {
    const rangeChanged = rangeKey !== previousRangeKey.current
    const valueChanged = valueKey !== previousValueKey.current
    const valueWasEmittedByThisControl = valueKey === localEchoValueKey.current

    if (rangeChanged || (valueChanged && !valueWasEmittedByThisControl)) {
      setText(propText)
      setUnit(propUnit)
      setError(null)
    }

    previousRangeKey.current = rangeKey
    previousValueKey.current = valueKey
    localEchoValueKey.current = null
  }, [propText, propUnit, rangeKey, valueKey])

  function emit(nextValue: DurationValue | undefined) {
    localEchoValueKey.current = durationValueKey(nextValue)
    onChange(nextValue)
  }

  function handleBlur() {
    if (!text.trim()) {
      setError(messages.library.enterValue)
      emit(undefined)
      return
    }
    const res = parseLocaleDecimal(text)
    if (!res.ok || !Number.isFinite(res.value) || res.value <= 0) {
      setError(messages.library.invalidNumber)
      emit(undefined)
      return
    }

    const num = res.value
    const ms = toMilliseconds(num, unit)
    if (ms < norm.minMs || ms > norm.maxMs) {
      setError(messages.library.valueMustBeBetween(formatDuration(range.min), formatDuration(range.max)))
      emit(undefined)
      return
    }

    setError(null)
    emit({ value: num, unit })
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
            emit(undefined)
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
                  emit({ value: num, unit: nextUnit })
                  return
                }
              }
            }
            emit(undefined)
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
