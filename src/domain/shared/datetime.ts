import { Temporal } from '@js-temporal/polyfill'
import type { InstantIso, LocalDate, LocalTime, TimeZoneId } from './types.datetime'

// Camada central de tempo (§4): TODA conversão civil ↔ instante passa aqui,
// sempre com Temporal e TimeZoneId EXPLÍCITO. O fuso do dispositivo nunca é
// autoridade. Proibido converter civil com new Date(string) / Date.parse.

// Política DST congelada:
//   GAP    (horário civil inexistente)  → deslocar PARA FRENTE pela duração do gap ('later').
//   OVERLAP (horário civil ambíguo)     → primeira ocorrência ('earlier').
export const DST_GAP_DISAMBIGUATION = 'later' as const
export const DST_OVERLAP_DISAMBIGUATION = 'earlier' as const

export type DateTimeErrorCode =
  | 'INVALID_LOCAL_DATE'
  | 'INVALID_LOCAL_TIME'
  | 'INVALID_TIME_ZONE'
  | 'INVALID_INSTANT'

/** Erro controlado de baixo nível; catálogo normativo de domínio pertence a etapas posteriores. */
export class DateTimeError extends Error {
  readonly code: DateTimeErrorCode

  constructor(code: DateTimeErrorCode, message: string) {
    super(message)
    this.name = 'DateTimeError'
    this.code = code
  }
}

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,9})?)?$/

function reject(fn: () => unknown): boolean {
  try {
    fn()
    return true
  } catch {
    return false
  }
}

export function isValidLocalDate(value: string): value is LocalDate {
  return (
    LOCAL_DATE_PATTERN.test(value) &&
    reject(() => Temporal.PlainDate.from(value, { overflow: 'reject' }))
  )
}

export function isValidLocalTime(value: string): value is LocalTime {
  return (
    LOCAL_TIME_PATTERN.test(value) &&
    reject(() => Temporal.PlainTime.from(value, { overflow: 'reject' }))
  )
}

export function isValidTimeZoneId(value: string): value is TimeZoneId {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function isValidInstantIso(value: string): value is InstantIso {
  return reject(() => Temporal.Instant.from(value))
}

export interface CivilToInstantInput {
  localDate: LocalDate
  localTime: LocalTime
  timeZone: TimeZoneId
}

/**
 * LocalDate + LocalTime + TimeZoneId → InstantIso canônico (termina em 'Z').
 * GAP ⇒ 'later'; OVERLAP ⇒ 'earlier'. Determinístico em qualquer host.
 */
export function civilToInstantIso(input: CivilToInstantInput): InstantIso {
  if (!isValidLocalDate(input.localDate)) {
    throw new DateTimeError('INVALID_LOCAL_DATE', `LocalDate inválida: ${JSON.stringify(input.localDate)}`)
  }
  if (!isValidLocalTime(input.localTime)) {
    throw new DateTimeError('INVALID_LOCAL_TIME', `LocalTime inválida: ${JSON.stringify(input.localTime)}`)
  }
  if (!isValidTimeZoneId(input.timeZone)) {
    throw new DateTimeError('INVALID_TIME_ZONE', `TimeZoneId inválido: ${JSON.stringify(input.timeZone)}`)
  }

  const civil = Temporal.PlainDate.from(input.localDate).toPlainDateTime(
    Temporal.PlainTime.from(input.localTime),
  )

  let zoned: Temporal.ZonedDateTime
  try {
    zoned = civil.toZonedDateTime(input.timeZone, { disambiguation: 'reject' })
  } catch {
    const earlier = civil.toZonedDateTime(input.timeZone, { disambiguation: DST_OVERLAP_DISAMBIGUATION })
    // OVERLAP: a ocorrência 'earlier' preserva exatamente o horário civil pedido.
    // GAP: nenhuma ocorrência preserva o horário civil ⇒ política 'later'.
    const isOverlap = earlier.toPlainDateTime().equals(civil)
    zoned = isOverlap
      ? earlier
      : civil.toZonedDateTime(input.timeZone, { disambiguation: DST_GAP_DISAMBIGUATION })
  }

  return zoned.toInstant().toString()
}

export interface ZonedParts {
  timeZone: TimeZoneId
  /** 'YYYY-MM-DD' no fuso informado. */
  localDate: LocalDate
  /** 'HH:mm' no fuso informado (apresentação/edição datetime-local). */
  localTime: LocalTime
  /** Offset UTC observado naquele instante/fuso, ex.: '-03:00'. */
  offset: string
  epochMilliseconds: number
}

/**
 * InstantIso + TimeZoneId → partes civis para apresentação/edição.
 * O instante permanece canônico; trocar TimeZoneId altera apenas a representação.
 */
export function instantToZonedParts(input: {
  instantIso: InstantIso
  timeZone: TimeZoneId
}): ZonedParts {
  if (!isValidInstantIso(input.instantIso)) {
    throw new DateTimeError('INVALID_INSTANT', `InstantIso inválido: ${JSON.stringify(input.instantIso)}`)
  }
  if (!isValidTimeZoneId(input.timeZone)) {
    throw new DateTimeError('INVALID_TIME_ZONE', `TimeZoneId inválido: ${JSON.stringify(input.timeZone)}`)
  }

  const instant = Temporal.Instant.from(input.instantIso)
  const zoned = instant.toZonedDateTimeISO(input.timeZone)
  const time = zoned.toPlainTime()
  return {
    timeZone: input.timeZone,
    localDate: zoned.toPlainDate().toString(),
    localTime: `${pad2(time.hour)}:${pad2(time.minute)}`,
    offset: zoned.offset,
    epochMilliseconds: zoned.epochMilliseconds,
  }
}

/** Normaliza qualquer InstantIso aceito pelo Temporal para a forma canônica com 'Z'. */
export function canonicalizeInstantIso(instantIso: InstantIso): InstantIso {
  if (!isValidInstantIso(instantIso)) {
    throw new DateTimeError('INVALID_INSTANT', `InstantIso inválido: ${JSON.stringify(instantIso)}`)
  }
  return Temporal.Instant.from(instantIso).toString()
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}
