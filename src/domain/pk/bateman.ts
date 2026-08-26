import { domainError } from '../shared/errors'
import type { SimulationDose } from '../types'

// Bateman numericamente estável (§4). Forma ÚNICA em todo o domínio finito:
//   central = dose · ka · Δt · exp(−slow·Δt) · phi(z),  z = gap·Δt, phi(z)=−expm1(−z)/z
// Extensão contínua phi(0)=1 ⇒ ka=ke reduz exatamente a dose·k·Δt·exp(−k·Δt).
// PROIBIDO o ramo exp(−ke·t)−exp(−ka·t); NEAR_DEGENERATE não seleciona algoritmo.

/** phi(z)=−expm1(−z)/z com extensão contínua phi(0)=1. */
export function phi(z: number): number {
  if (z === 0) {
    return 1
  }
  return -Math.expm1(-z) / z
}

export interface DoseKinetics {
  kePerMs: number
  /** null = absorção instantânea. */
  kaPerMs: number | null
}

/**
 * Quantidade no compartimento central de UMA dose após Δt≥0 (ms), mg.
 * Δt<0 ⇒ 0. Underflow legítimo do termo exponencial ⇒ 0.
 * Não-finito inesperado com parâmetros válidos ⇒ NUMERIC_FAILURE.
 * Clamp [0,dose] somente APÓS confirmar finitude.
 */
export function stableBatemanAmount(doseAmountMg: number, deltaMs: number, kinetics: DoseKinetics): number {
  if (deltaMs < 0) {
    return 0
  }
  if (!Number.isFinite(deltaMs)) {
    throw domainError('NUMERIC_FAILURE', { deltaMs })
  }

  const { kePerMs, kaPerMs } = kinetics
  let raw: number
  if (kaPerMs === null) {
    raw = doseAmountMg * Math.exp(-kePerMs * deltaMs)
  } else {
    const gap = Math.abs(kaPerMs - kePerMs)
    const slow = Math.min(kaPerMs, kePerMs)
    const z = gap * deltaMs
    raw = doseAmountMg * kaPerMs * deltaMs * Math.exp(-slow * deltaMs) * phi(z)
  }

  if (!Number.isFinite(raw)) {
    throw domainError('NUMERIC_FAILURE', { deltaMs, amountMg: raw })
  }
  return Math.min(Math.max(raw, 0), doseAmountMg)
}

/**
 * Depósito remanescente de UMA dose após Δt≥0 (ms), mg.
 * Absorção instantânea NÃO possui depósito. Underflow legítimo ⇒ 0.
 */
export function depotFromDose(doseAmountMg: number, deltaMs: number, kinetics: DoseKinetics): number {
  if (deltaMs < 0 || kinetics.kaPerMs === null) {
    return 0
  }
  if (!Number.isFinite(deltaMs)) {
    throw domainError('NUMERIC_FAILURE', { deltaMs })
  }
  const raw = doseAmountMg * Math.exp(-kinetics.kaPerMs * deltaMs)
  if (!Number.isFinite(raw)) {
    throw domainError('NUMERIC_FAILURE', { deltaMs, amountMg: raw })
  }
  return Math.min(Math.max(raw, 0), doseAmountMg)
}

/**
 * contribution_i(t) = central_i(t) + depot_i(t).
 * NUNCA inclui eliminated — eliminado não é contribuição presente.
 * Base semântica da prova de cutoff da E4.
 */
export function contributionFromDose(doseAmountMg: number, deltaMs: number, kinetics: DoseKinetics): number {
  return (
    stableBatemanAmount(doseAmountMg, deltaMs, kinetics) +
    depotFromDose(doseAmountMg, deltaMs, kinetics)
  )
}

/** Soma das contribuições presentes de um conjunto de doses num instante t (superposição linear). */
export function totalContribution(doses: SimulationDose[], atTimeMs: number, kinetics: DoseKinetics): number {
  let total = 0
  for (const dose of doses) {
    if (dose.timeMs <= atTimeMs) {
      total += contributionFromDose(dose.amountMg, atTimeMs - dose.timeMs, kinetics)
    }
  }
  return total
}
