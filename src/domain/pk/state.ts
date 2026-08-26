import { conservationClose } from '../shared/tolerances'
import { domainError } from '../shared/errors'
import type { PkState, SimulationDose } from '../types'
import { absorptionRateFromTmax } from './rates'
import { depotFromDose, stableBatemanAmount, type DoseKinetics } from './bateman'

// Estado por dose + superposição LINEAR (§4). Doses futuras NUNCA entram no estado atual.

export function resolveKinetics(halfLifeMs: number, tmaxMs: number | null): DoseKinetics {
  const { kePerMs, kaPerMs } = absorptionRateFromTmax({ halfLifeMs, tmaxMs })
  return { kePerMs, kaPerMs }
}

/** Quantidade presente (central) de uma dose no instante t. */
export function amountFromDose(dose: SimulationDose, atTimeMs: number, kinetics: DoseKinetics): number {
  return stableBatemanAmount(dose.amountMg, atTimeMs - dose.timeMs, kinetics)
}

export function totalAmount(centralMg: number, depotMg: number): number {
  return centralMg + depotMg
}

function sortDoses(doses: SimulationDose[]): SimulationDose[] {
  return [...doses].sort((a, b) => a.timeMs - b.timeMs)
}

/**
 * Estado farmacocinético agregado em `atTimeMs`:
 *  - administeredMg/plannedCount consideram apenas a fronteira timeMs ≤ t;
 *  - eliminated = max(0, adm − central − depot);
 *  - conservação verificada por conservationClose;
 *  - percentuais como frações [0,1] (UI converte para %).
 */
export function stateAt(doses: SimulationDose[], atTimeMs: number, halfLifeMs: number, tmaxMs: number | null): PkState {
  if (!Number.isFinite(atTimeMs)) {
    throw domainError('NUMERIC_FAILURE', { atTimeMs })
  }

  const kinetics = resolveKinetics(halfLifeMs, tmaxMs)

  let administeredMg = 0
  let centralMg = 0
  let depotMg = 0
  let administeredCount = 0
  let plannedCount = 0

  for (const dose of doses) {
    if (!Number.isFinite(dose.amountMg) || dose.amountMg <= 0) {
      throw domainError('INVALID_DOSE_AMOUNT', { doseId: dose.id })
    }
    if (!Number.isFinite(dose.timeMs)) {
      throw domainError('INVALID_DOSE_TIME', { doseId: dose.id })
    }
    if (dose.timeMs <= atTimeMs) {
      administeredCount++
      administeredMg += dose.amountMg
      centralMg += amountFromDose(dose, atTimeMs, kinetics)
      depotMg += depotFromDose(dose.amountMg, atTimeMs - dose.timeMs, kinetics)
    } else {
      plannedCount++
    }
  }

  const eliminatedMg = Math.max(0, administeredMg - centralMg - depotMg)

  if (!conservationClose(administeredMg, totalAmount(centralMg, depotMg) + eliminatedMg)) {
    throw domainError('NUMERIC_FAILURE', {
      administeredMg,
      centralMg,
      depotMg,
      eliminatedMg,
    })
  }

  const denominator = administeredMg > 0 ? administeredMg : 1
  const factor = administeredMg > 0 ? 1 / denominator : 0

  return {
    administeredMg,
    centralMg,
    depotMg,
    eliminatedMg,
    administeredCount,
    plannedCount,
    centralPercent: centralMg * factor,
    depotPercent: depotMg * factor,
    eliminatedPercent: eliminatedMg * factor,
  }
}

/** Taxa terminal: instantânea ⇒ ke; finita ⇒ min(ke,ka). Alimenta horizonte/cutoff/metadata. */
export function terminalRate(kinetics: DoseKinetics): number {
  return kinetics.kaPerMs === null ? kinetics.kePerMs : Math.min(kinetics.kePerMs, kinetics.kaPerMs)
}

/** Ordenação determinística ascendente por tempo (cópia; entrada nunca mutada). */
export function sortedDoses(doses: SimulationDose[]): SimulationDose[] {
  return sortDoses(doses)
}
