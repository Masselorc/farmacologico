import { Temporal } from '@js-temporal/polyfill'
import type { InstantIso, TimeZoneId } from '../shared/types.datetime'
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from './convert'

// Formatação pt-BR (§4): arredondamento/formato existem SOMENTE aqui, na apresentação.
// Locale normativo da V1: pt-BR. Nenhum formatador depende do locale/fuso do host.

export const APP_LOCALE = 'pt-BR'

const massFormatter = new Intl.NumberFormat(APP_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
})

/** Massa/dose em mg com até 3 casas decimais pt-BR. Ex.: 0.5→"0,5" · 1.234→"1,234". */
export function formatMassMg(valueMg: number): string {
  return massFormatter.format(valueMg)
}

/**
 * Duração no formato normativo "X d Y h Z min" (ou "0 min").
 * Unidades zeradas intermediárias são omitidas ("1 d 30 min").
 * Resíduo < 1 min é truncado na APRESENTAÇÃO (estado científico permanece em ms).
 * Entrada negativa é tratada como 0 para apresentação.
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / MS_PER_MINUTE))
  if (totalMinutes === 0) {
    return '0 min'
  }
  const days = Math.floor(totalMinutes / (MS_PER_DAY / MS_PER_MINUTE))
  const hours = Math.floor((totalMinutes % (MS_PER_DAY / MS_PER_MINUTE)) / (MS_PER_HOUR / MS_PER_MINUTE))
  const minutes = totalMinutes % (MS_PER_HOUR / MS_PER_MINUTE)

  const parts: string[] = []
  if (days > 0) parts.push(`${days} d`)
  if (hours > 0) parts.push(`${hours} h`)
  if (minutes > 0) parts.push(`${minutes} min`)
  return parts.length > 0 ? parts.join(' ') : '0 min'
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function zonedOrThrow(instantIso: InstantIso, timeZone: TimeZoneId): Temporal.ZonedDateTime {
  const instant = Temporal.Instant.from(instantIso)
  return instant.toZonedDateTimeISO(timeZone)
}

/** Data curta normativa: dd/mm/aaaa hh:mm, no TimeZoneId informado. */
export function formatShortDateTime(instantIso: InstantIso, timeZone: TimeZoneId): string {
  const zoned = zonedOrThrow(instantIso, timeZone)
  const date = zoned.toPlainDate()
  return `${pad2(date.day)}/${pad2(date.month)}/${date.year} ${pad2(zoned.hour)}:${pad2(zoned.minute)}`
}

/** Data completa por extenso pt-BR (título/tooltip), no TimeZoneId informado. */
export function formatLongDateTime(instantIso: InstantIso, timeZone: TimeZoneId): string {
  const zoned = zonedOrThrow(instantIso, timeZone)
  const formatter = new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone,
  })
  return formatter.format(zoned.toInstant().epochMilliseconds)
}
