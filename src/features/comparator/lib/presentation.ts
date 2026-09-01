import { fromMilligrams } from '../../../domain/units/convert'
import {
  formatDuration,
  formatLongDateTime,
  formatShortDateTime,
} from '../../../domain/units/format'
import type { InstantIso, MassUnit, TimeZoneId } from '../../../domain/types'

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
  minimumFractionDigits: 0,
  useGrouping: false,
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
  useGrouping: false,
})

export function formatPresentationNumber(value: number, maxDigits = 3): string {
  if (!Number.isFinite(value)) return String(value)
  if (maxDigits === 3) return numberFormatter.format(value)
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(value)
}

export function formatPresentationMass(
  amountMg: number,
  displayUnit: MassUnit = 'mg',
  includeUnit = true,
): string {
  const converted = fromMilligrams(amountMg, displayUnit)
  const formatted = formatPresentationNumber(converted, 3)
  return includeUnit ? `${formatted} ${displayUnit}` : formatted
}

export function formatPresentationPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '0%'
  return `${percentFormatter.format(ratio * 100)}%`
}

export function formatPresentationDateShort(
  instantIso: InstantIso,
  timeZone: TimeZoneId,
): string {
  return formatShortDateTime(instantIso, timeZone)
}

export function formatPresentationDateLong(
  instantIso: InstantIso,
  timeZone: TimeZoneId,
): string {
  return formatLongDateTime(instantIso, timeZone)
}

export function formatPresentationDuration(ms: number): string {
  return formatDuration(ms)
}
