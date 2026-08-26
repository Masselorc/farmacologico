import { Temporal } from '@js-temporal/polyfill'
import Decimal from 'decimal.js'
import fc from 'fast-check'
import type { IProperty } from 'fast-check'
import { civilToInstantIso, instantToZonedParts } from '../../../domain/shared/datetime'
import { depotFromDose, stableBatemanAmount, type DoseKinetics } from '../../../domain/pk/bateman'
import type { Occurrence, Schedule } from '../../../domain/types'

// Oráculos independentes da E4. NENHUM oráculo reorganiza as branches do motor.

/** Seeds determinísticas exigidas pela etapa (multi-seed contra amostragem acidental). */
export const E4_SEEDS = [1, 42, 20260826, 0x5a17] as const

/** Executa a property sob TODAS as seeds canônicas (shrinking habilitado por padrão). */
export function forAllSeeds<T>(
  property: IProperty<T>,
  options?: { numRuns?: number },
): void {
  for (const seed of E4_SEEDS) {
    fc.assert(property, { seed, numRuns: options?.numRuns })
  }
}

/**
 * Oráculo estável de g(y)=y/expm1(y): série própria (até y⁴) perto de zero,
 * forma via Math.exp fora da vizinhança — caminho numérico DISTINTO do solver.
 */
export function oracleG(y: number): number {
  if (Math.abs(y) < 1e-8) {
    const y2 = y * y
    return 1 - y / 2 + y2 / 12 - (y2 * y2) / 720
  }
  if (y < -50) {
    return -y / (1 - Math.exp(y))
  }
  if (y > 700) {
    return y * Math.exp(-y)
  }
  return y / (Math.exp(y) - 1)
}

Decimal.set({ precision: 60, rounding: Decimal.ROUND_HALF_EVEN })

/**
 * Oráculo de precisão ampliada (Decimal.js, DEV-ONLY) para o central Bateman.
 * Mesma matemática normativa avaliada em 60 dígitos — referência independente
 * da aritmética double do motor.
 */
export function decimalOracleCentral(
  doseMg: number,
  deltaMs: number,
  kePerMs: number,
  kaPerMs: number | null,
): number {
  if (deltaMs < 0) return 0
  const dose = new Decimal(doseMg)
  const dt = new Decimal(deltaMs)
  const ke = new Decimal(kePerMs)
  let raw: Decimal
  if (kaPerMs === null) {
    raw = dt.eq(0) ? dose : dose.mul(ke.mul(dt).neg().exp())
  } else {
    const ka = new Decimal(kaPerMs)
    const gap = ka.minus(ke).abs()
    const slow = Decimal.min(ka, ke)
    const z = gap.mul(dt)
    const phi = z.eq(0) ? new Decimal(1) : z.neg().exp().minus(1).div(z).neg()
    raw = dose.mul(ka).mul(dt).mul(slow.mul(dt).neg().exp()).mul(phi)
  }
  if (!raw.isFinite()) {
    return Number.NaN
  }
  return Decimal.min(Decimal.max(raw, 0), dose).toNumber()
}

/** Oráculo de precisão ampliada para o depósito. */
export function decimalOracleDepot(
  doseMg: number,
  deltaMs: number,
  kaPerMs: number | null,
): number {
  if (deltaMs < 0 || kaPerMs === null) return 0
  const raw = new Decimal(doseMg).mul(new Decimal(kaPerMs).mul(deltaMs).neg().exp())
  if (!raw.isFinite()) return Number.NaN
  return Decimal.min(Decimal.max(raw, 0), new Decimal(doseMg)).toNumber()
}

/** Soma física central+depot de um universo de doses num instante (loop próprio dos testes). */
export function universeAmounts(
  doses: Array<{ amountMg: number; timeMs: number }>,
  atTimeMs: number,
  kinetics: DoseKinetics,
): { centralMg: number; depotMg: number; totalPresentMg: number } {
  let centralMg = 0
  let depotMg = 0
  for (const dose of doses) {
    if (dose.timeMs > atTimeMs) continue
    centralMg += stableBatemanAmount(dose.amountMg, atTimeMs - dose.timeMs, kinetics)
    depotMg += depotFromDose(dose.amountMg, atTimeMs - dose.timeMs, kinetics)
  }
  return { centralMg, depotMg, totalPresentMg: centralMg + depotMg }
}

/** ISO weekday (1..7) de uma LocalDate — derivado independentemente via Temporal. */
export function isoWeekdayOf(localDate: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return Temporal.PlainDate.from(localDate).dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7
}

function epochMsOf(instantIso: string, timeZone: string): number {
  return instantToZonedParts({ instantIso, timeZone }).epochMilliseconds
}

/**
 * ORÁCULO BRUTE-FORCE de recorrência: varre TODO o calendário civil da vigência
 * (sem janela otimizada), converte cada data candidata pela camada E2 e filtra.
 * Independente do algoritmo proporcional à janela implementado no motor.
 */
export function bruteForceOccurrences(
  schedule: Schedule,
  rangeStartMs: number,
  rangeEndMs: number,
): Occurrence[] {
  const start = Temporal.PlainDate.from(schedule.startDate)
  const last =
    schedule.recurrence.type === 'single'
      ? start
      : start.add({ days: schedule.recurrence.weeks * 7 - 1 })

  const selected =
    schedule.recurrence.type === 'single'
      ? null
      : new Set<number>(schedule.recurrence.weekdays as ReadonlyArray<number>)

  const occurrences: Occurrence[] = []
  const seen = new Set<number>()

  let current = start
  while (Temporal.PlainDate.compare(current, last) <= 0) {
    const localDate = current.toString()
    const instantMs = epochMsOf(
      civilToInstantIso({
        localDate,
        localTime: schedule.localTime,
        timeZone: schedule.timeZone,
      }),
      schedule.timeZone,
    )
    const weekdayOk = selected === null || selected.has(isoWeekdayOf(localDate))
    const inWindow = instantMs >= rangeStartMs && instantMs < rangeEndMs
    if (weekdayOk && inWindow && !seen.has(instantMs)) {
      seen.add(instantMs)
      occurrences.push({ instantMs, scheduleLocalDate: localDate })
    }
    current = current.add({ days: 1 })
  }

  occurrences.sort((a, b) => a.instantMs - b.instantMs)
  return occurrences
}
