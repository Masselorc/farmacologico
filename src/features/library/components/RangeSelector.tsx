import { useState } from 'react'
import type { DurationRange, DurationValue, TimeUnit } from '../../../domain/shared/types.datetime'
import { normalizeDurationRange, toMilliseconds } from '../../../domain/units/convert'
import { parseLocaleDecimal } from '../../../domain/units/decimal'

export interface RangeSelectorProps {
  label: string
  range: DurationRange
  value?: DurationValue
  onChange: (value: DurationValue) => void
}

export function RangeSelector({ label, range, value, onChange }: RangeSelectorProps) {
  const norm = normalizeDurationRange(range)
  const [text, setText] = useState(value ? String(value.value) : '')
  const [unit, setUnit] = useState<TimeUnit>(value?.unit ?? range.min.unit)
  const [error, setError] = useState<string | null>(null)

  function handleBlur() {
    if (!text.trim()) {
      setError('Informe um valor.')
      return
    }
    const res = parseLocaleDecimal(text)
    if (!res.ok || !Number.isFinite(res.value) || res.value <= 0) {
      setError('Número inválido.')
      return
    }

    const num = res.value
    const ms = toMilliseconds(num, unit)
    if (ms < norm.minMs || ms > norm.maxMs) {
      setError(`O valor deve estar entre ${range.min.value} ${range.min.unit} e ${range.max.value} ${range.max.unit}.`)
      return
    }

    setError(null)
    onChange({ value: num, unit })
  }

  return (
    <div className="range-selector">
      <label className="range-label">{label}</label>
      <div className="range-bounds-text">
        Faixa permitida: {range.min.value} {range.min.unit} a {range.max.value} {range.max.unit}
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
                }
              }
            }
          }}
        >
          <option value="minutes">minutos</option>
          <option value="hours">horas</option>
          <option value="days">dias</option>
        </select>
      </div>
      {error && <span className="range-error">{error}</span>}
    </div>
  )
}
