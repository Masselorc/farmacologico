import { PK_ENGINE_VERSION } from '../version'
import { domainError } from '../shared/errors'
import { MILESTONE_TIME_ABS_TOL_MS } from '../shared/tolerances'
import { NEAR_DEGENERATE_RATES_REL } from '../shared/tolerances'
import type { PkWarningCode, SimulationInput, SimulationOutput } from '../types'
import { SAFETY_LIMITS } from '../../validation/limits'
import { depotFromDose, stableBatemanAmount, type DoseKinetics } from './bateman'
import { CONTRIBUTION_CUTOFF_HALF_LIVES, cutoffAgeFor, effectiveTmaxMs } from './cutoff'
import { absorptionRateFromTmax } from './rates'
import { sortedDoses } from './state'

// PK Engine — analyze(input): SimulationOutput (§7).
// Não conhece Schedule/Recurrence/dataset. Arredondamento interno proibido.

const DEFAULT_ANALYSIS_CURVE_STEPS = 1600
const PEAK_TERNARY_ITERATIONS = 80
const MILESTONE_BISECTION_ITERATIONS = 80
const MILESTONE_PERCENTAGES = [50, 25, 12.5, 10, 5, 1, 0.1] as const

function validateInput(input: SimulationInput): void {
  if (!Number.isFinite(input.nowMs)) {
    throw domainError('NUMERIC_FAILURE', { nowMs: input.nowMs })
  }
  if (!Array.isArray(input.doses) || input.doses.length === 0) {
    throw domainError('NO_DOSES')
  }
  for (const dose of input.doses) {
    if (!Number.isFinite(dose.amountMg) || dose.amountMg <= 0 || dose.amountMg > SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX) {
      throw domainError('INVALID_DOSE_AMOUNT', { doseId: dose.id })
    }
    if (!Number.isFinite(dose.timeMs)) {
      throw domainError('INVALID_DOSE_TIME', { doseId: dose.id })
    }
  }
  if (
    input.analysisCurveSteps !== undefined &&
    (!Number.isInteger(input.analysisCurveSteps) || input.analysisCurveSteps < 1)
  ) {
    throw domainError('INVALID_HORIZON', { analysisCurveSteps: input.analysisCurveSteps })
  }
}

// Curva de análise = quantidade no compartimento CENTRAL (superposição linear).
// Depot/estado completo pertencem a stateAt; contribuição (central+depot) à prova de cutoff da E4.
function buildCentralSuperposition(dosesSorted: ReturnType<typeof sortedDoses>, kinetics: DoseKinetics) {
  return (timeMs: number): number => {
    let total = 0
    for (const dose of dosesSorted) {
      if (dose.timeMs > timeMs) break
      total += stableBatemanAmount(dose.amountMg, timeMs - dose.timeMs, kinetics)
    }
    return total
  }
}

export function analyze(input: SimulationInput): SimulationOutput {
  validateInput(input)

  const { kePerMs, kaPerMs } = absorptionRateFromTmax({
    halfLifeMs: input.halfLifeMs,
    tmaxMs: input.tmaxMs,
  })
  const kinetics: DoseKinetics = { kePerMs, kaPerMs }

  const warnings: PkWarningCode[] = []
  if (kaPerMs !== null && kaPerMs < kePerMs) {
    warnings.push('FLIP_FLOP_ABSORPTION')
  }
  if (
    kaPerMs !== null &&
    Math.abs(kaPerMs - kePerMs) / Math.max(kaPerMs, kePerMs) <= NEAR_DEGENERATE_RATES_REL
  ) {
    warnings.push('NEAR_DEGENERATE_RATES')
  }

  const dosesSorted = sortedDoses(input.doses)
  const firstDoseTimeMs = dosesSorted[0]!.timeMs
  const lastDoseTimeMs = dosesSorted[dosesSorted.length - 1]!.timeMs

  const effTmax = effectiveTmaxMs({ halfLifeMs: input.halfLifeMs, tmaxMs: input.tmaxMs })
  const terminalRatePerMs =
    kaPerMs === null ? kePerMs : Math.min(kePerMs, kaPerMs)
  const terminalHalfLifeMs = Math.LN2 / terminalRatePerMs

  const horizonSpanMs = Math.max(
    10.5 * terminalHalfLifeMs,
    2 * effTmax,
    2 * input.halfLifeMs,
  )
  const horizonEndMs = lastDoseTimeMs + horizonSpanMs
  if (!Number.isFinite(horizonEndMs) || horizonEndMs <= firstDoseTimeMs) {
    throw domainError('INVALID_HORIZON', { horizonEndMs })
  }

  // ── Curva de análise: grade regular + pontos críticos determinísticos ──
  const steps = input.analysisCurveSteps ?? DEFAULT_ANALYSIS_CURVE_STEPS
  const stepMs = (horizonEndMs - firstDoseTimeMs) / steps
  const timestampSet = new Set<number>()
  for (let i = 0; i <= steps; i++) {
    timestampSet.add(firstDoseTimeMs + i * stepMs)
  }
  for (const dose of dosesSorted) {
    if (dose.timeMs >= firstDoseTimeMs && dose.timeMs <= horizonEndMs) {
      timestampSet.add(dose.timeMs)
    }
    const tmaxPoint = dose.timeMs + effTmax
    if (effTmax > 0 && tmaxPoint >= firstDoseTimeMs && tmaxPoint <= horizonEndMs) {
      timestampSet.add(tmaxPoint)
    }
  }
  const timestamps = [...timestampSet].sort((a, b) => a - b)

  const amountAt = buildCentralSuperposition(dosesSorted, kinetics)
  const analysisCurve = timestamps.map((timeMs) => ({
    timeMs,
    amountMg: amountAt(timeMs),
  }))

  // ── Pico: varredura + refinamento ternário (80 iterações) no entorno local ──
  let scanIdx = 0
  for (let i = 1; i < analysisCurve.length; i++) {
    if (analysisCurve[i]!.amountMg > analysisCurve[scanIdx]!.amountMg) {
      scanIdx = i
    }
  }
  const bracketLo = analysisCurve[Math.max(0, scanIdx - 1)]!.timeMs
  const bracketHi = analysisCurve[Math.min(analysisCurve.length - 1, scanIdx + 1)]!.timeMs

  const candidates: Array<{ timeMs: number; amountMg: number }> = [
    analysisCurve[scanIdx]!,
  ]
  if (bracketHi > bracketLo) {
    let lo = bracketLo
    let hi = bracketHi
    for (let i = 0; i < PEAK_TERNARY_ITERATIONS; i++) {
      const m1 = lo + (hi - lo) / 3
      const m2 = hi - (hi - lo) / 3
      if (amountAt(m1) < amountAt(m2)) {
        lo = m1
      } else {
        hi = m2
      }
    }
    candidates.push({ timeMs: lo, amountMg: amountAt(lo) })
    candidates.push({ timeMs: hi, amountMg: amountAt(hi) })
  }
  let peak = candidates[0]!
  for (const candidate of candidates.slice(1)) {
    if (candidate.amountMg > peak.amountMg) {
      peak = candidate
    }
  }

  // ── Marcos: última travessia descendente de cada alvo APÓS o pico ──
  const milestones: SimulationOutput['milestones'] = []
  for (const percentage of MILESTONE_PERCENTAGES) {
    const targetMg = (peak.amountMg * percentage) / 100
    let loIdx = -1
    for (let i = analysisCurve.length - 1; i >= 0; i--) {
      const point = analysisCurve[i]!
      if (point.timeMs <= peak.timeMs - MILESTONE_TIME_ABS_TOL_MS) {
        break
      }
      if (point.amountMg >= targetMg) {
        loIdx = i
        break
      }
    }

    let timeMs: number | null = null
    if (loIdx >= 0 && loIdx < analysisCurve.length - 1) {
      let lo = analysisCurve[loIdx]!.timeMs
      let hi = analysisCurve[loIdx + 1]!.timeMs
      for (let i = 0; i < MILESTONE_BISECTION_ITERATIONS; i++) {
        const mid = (lo + hi) / 2
        if (amountAt(mid) >= targetMg) {
          lo = mid
        } else {
          hi = mid
        }
      }
      timeMs = lo
    } else {
      warnings.push('MILESTONE_NOT_REACHED')
    }

    milestones.push({ percentage, targetMg, timeMs })
  }

  return {
    currentState: currentStateOf(input, dosesSorted, kinetics),
    analysisCurve,
    peak,
    milestones,
    administrations: dosesSorted.map((dose) => ({
      doseId: dose.id,
      timeMs: dose.timeMs,
      amountMg: dose.amountMg,
    })),
    warnings,
    metadata: {
      pkEngineVersion: PK_ENGINE_VERSION,
      kePerMs,
      kaPerMs,
      terminalHalfLifeMs,
      horizonEndMs,
      analysisCurveSteps: steps,
      contributionCutoffHalfLives: CONTRIBUTION_CUTOFF_HALF_LIVES,
      contributionCutoffAgeMs: cutoffAgeFor({
        halfLifeMs: input.halfLifeMs,
        tmaxMs: input.tmaxMs,
      }),
    },
  }
}

function currentStateOf(
  input: SimulationInput,
  dosesSorted: ReturnType<typeof sortedDoses>,
  kinetics: DoseKinetics,
): SimulationOutput['currentState'] {
  let administeredMg = 0
  let centralMg = 0
  let depotMg = 0
  let administeredCount = 0
  let plannedCount = 0

  for (const dose of dosesSorted) {
    if (dose.timeMs <= input.nowMs) {
      administeredCount++
      administeredMg += dose.amountMg
      centralMg += stableBatemanAmount(dose.amountMg, input.nowMs - dose.timeMs, kinetics)
      depotMg += depotFromDose(dose.amountMg, input.nowMs - dose.timeMs, kinetics)
    } else {
      plannedCount++
    }
  }

  const eliminatedMg = Math.max(0, administeredMg - centralMg - depotMg)
  const factor = administeredMg > 0 ? 1 / administeredMg : 0

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
