// Primitivos temporais e de unidades (§6, "Primitivos").
// Aliases conceituais: os valores seguem formatos canônicos validados em
// src/domain/shared/datetime.ts (LocalDate 'YYYY-MM-DD', LocalTime 'HH:mm[:ss]',
// InstantIso com 'Z', TimeZoneId IANA).

export type LocalDate = string
export type LocalTime = string
export type InstantIso = string
export type TimeZoneId = string

export type TimeUnit = 'minutes' | 'hours' | 'days'
export type MassUnit = 'mcg' | 'mg' | 'g'

/** finite>0; unidade interna normalizada: ms. */
export interface DurationValue {
  value: number
  unit: TimeUnit
}

/** Unidades podem diferir entre min/max; comparação sempre pós-conversão para ms. */
export interface DurationRange {
  min: DurationValue
  max: DurationValue
}

export type Duration = DurationValue | DurationRange
