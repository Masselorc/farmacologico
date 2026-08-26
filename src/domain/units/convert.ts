import type { DurationRange, DurationValue, MassUnit, TimeUnit } from '../shared/types.datetime'

// Constantes normativas (§4): internamente SEMPRE ms e mg.
// Proibido espalhar multiplicadores pelo projeto.
export const MS_PER_MINUTE = 60_000
export const MS_PER_HOUR = 3_600_000
export const MS_PER_DAY = 86_400_000

export const MCG_PER_MG = 1000
export const MG_PER_GRAM = 1000

/** Conversão central para a unidade interna de tempo (ms). Matemática pura IEEE-754. */
export function toMilliseconds(value: number, unit: TimeUnit): number {
  switch (unit) {
    case 'minutes':
      return value * MS_PER_MINUTE
    case 'hours':
      return value * MS_PER_HOUR
    case 'days':
      return value * MS_PER_DAY
  }
}

export function millisecondsToMinutes(ms: number): number {
  return ms / MS_PER_MINUTE
}

export function millisecondsToHours(ms: number): number {
  return ms / MS_PER_HOUR
}

export function millisecondsToDays(ms: number): number {
  return ms / MS_PER_DAY
}

/** Conversão central para a unidade interna de massa (mg). Sem arredondamento interno. */
export function toMilligrams(value: number, unit: MassUnit): number {
  switch (unit) {
    case 'mcg':
      return value / MCG_PER_MG
    case 'mg':
      return value
    case 'g':
      return value * MG_PER_GRAM
  }
}

/** Conversão a partir da unidade interna (mg). Sem arredondamento interno. */
export function fromMilligrams(valueMg: number, unit: MassUnit): number {
  switch (unit) {
    case 'mcg':
      return valueMg * MCG_PER_MG
    case 'mg':
      return valueMg
    case 'g':
      return valueMg / MG_PER_GRAM
  }
}

/** DurationValue → unidade interna (ms). */
export function durationValueToMs(value: DurationValue): number {
  return toMilliseconds(value.value, value.unit)
}

/** Comparação APÓS conversão para ms: -1 | 0 | 1. Ex.: 24 h <= 2 d. */
export function compareDurationValues(a: DurationValue, b: DurationValue): -1 | 0 | 1 {
  const aMs = durationValueToMs(a)
  const bMs = durationValueToMs(b)
  if (aMs < bMs) return -1
  if (aMs > bMs) return 1
  return 0
}

/**
 * Normaliza DurationRange para {minMs, maxMs} ordenado após conversão para ms.
 * A validação/rejeição de intervalo inválido (LIMITS) pertence à E5; aqui apenas
 * a normalização determinística por ms.
 */
export function normalizeDurationRange(range: DurationRange): { minMs: number; maxMs: number } {
  const aMs = durationValueToMs(range.min)
  const bMs = durationValueToMs(range.max)
  return aMs <= bMs ? { minMs: aMs, maxMs: bMs } : { minMs: bMs, maxMs: aMs }
}
