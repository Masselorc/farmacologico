import { describe, expect, it } from 'vitest'
import { contributionFromDose, depotFromDose, stableBatemanAmount, type DoseKinetics } from '../../../domain/pk/bateman'
import {
  CONTRIBUTION_CUTOFF_HALF_LIVES,
  cutoffAgeFor,
} from '../../../domain/pk/cutoff'
import { absorptionRateFromTmax, eliminationRate } from '../../../domain/pk/rates'
import { CUTOFF_TOLERANCE } from '../../../domain/shared/tolerances'
import type { SelectedPkParameters } from '../../../domain/types'
import {
  DEGENERATE_CENTRAL_FRACTION,
  DEGENERATE_DEPOT_FRACTION,
  INSTANT_RESIDUAL_FRACTION,
  MS_PER_DAY,
} from './cutoff-fixtures'
import { forAllSeeds } from './helpers'
import fc from 'fast-check'

// Varredura ampla por q = max(ke,ka)/min(ke,ka), densa perto de 1 e cobrindo ordens de magnitude.
const Q_SWEEP = [
  1 + 1e-12, 1 + 1e-10, 1 + 1e-8, 1 + 1e-6,
  1.001, 1.01, 1.1, 2, 10, 100, 10_000, 1_000_000,
]

/** Constrói selected+kinetics para um q alvo nos DOIS lados físicos (ka>ke e ka<ke). */
function buildSide(kePerMs: number, q: number, side: 'faster' | 'slower'): {
  selected: SelectedPkParameters
  kinetics: DoseKinetics
} {
  const halfLifeMs = Math.LN2 / kePerMs
  const kaPerMs = side === 'faster' ? kePerMs * q : kePerMs / q
  const tmaxMs =
    q === 1 ? halfLifeMs / Math.LN2 : Math.abs(Math.log(q)) / Math.abs(kaPerMs - kePerMs)
  const selected = { halfLifeMs, tmaxMs }
  // Confirma que o solver reproduz o par desejado dentro da região representável.
  if (Number.isFinite(tmaxMs) && tmaxMs > 0 && tmaxMs <= 3650 * MS_PER_DAY) {
    const solved = absorptionRateFromTmax(selected)
    expect(solved.kaPerMs).not.toBeNull()
  }
  return { selected, kinetics: { kePerMs, kaPerMs } }
}

describe('E4 cutoff — constantes normativas', () => {
  it('44 e CUTOFF_TOLERANCE=1e-12; nenhum resíduo de 40', () => {
    expect(CONTRIBUTION_CUTOFF_HALF_LIVES).toBe(44)
    expect(CUTOFF_TOLERANCE).toBe(1e-12)
  })
})

describe('E4 cutoff — caso degenerado exato ka=ke com k·Tmax=1', () => {
  it('central/dose ≈6.5868117237e-13 · depot/dose ≈2.0911525165e-14 · total ≈6.7959269753e-13 < 1e-12', () => {
    // Escolhe k tal que Tmax=1/k caia no domínio: k=ln2/(48h); Tmax=1/k.
    const halfLifeMs = 48 * 3_600_000
    const k = eliminationRate(halfLifeMs)
    const tmaxMs = 1 / k
    const selected = { halfLifeMs, tmaxMs }
    const kinetics = { kePerMs: k, kaPerMs: k }

    const ageMs = tmaxMs + CONTRIBUTION_CUTOFF_HALF_LIVES * (Math.LN2 / k)
    const doseMg = 1000

    const central = stableBatemanAmount(doseMg, ageMs, kinetics)
    const centralAnalytic = doseMg * k * ageMs * Math.exp(-k * ageMs)
    const x = k * ageMs
    expect(x).toBeCloseTo(1 + 44 * Math.LN2, 9)

    const centralFraction = central / doseMg
    expect(Math.abs(central - centralAnalytic)).toBeLessThanOrEqual(1e-12)
    expect(Math.abs(centralFraction - DEGENERATE_CENTRAL_FRACTION) / DEGENERATE_CENTRAL_FRACTION).toBeLessThanOrEqual(1e-6)

    // Depot isolado (fração analítica independente):
    const depotFraction = depotFromDose(doseMg, ageMs, kinetics) / doseMg
    expect(Math.abs(depotFraction - DEGENERATE_DEPOT_FRACTION) / DEGENERATE_DEPOT_FRACTION).toBeLessThanOrEqual(1e-6)

    // Total presente < CUTOFF_TOLERANCE·dose na idade de corte (e depois).
    expect(central).toBeLessThan(CUTOFF_TOLERANCE * doseMg)
    for (const extra of [0.1 * halfLifeMs, halfLifeMs, 10 * halfLifeMs]) {
      const later = contributionFromDose(doseMg, ageMs + extra, kinetics)
      expect(later).toBeLessThan(CUTOFF_TOLERANCE * doseMg)
    }

    // O cutoff do motor usa a idade normativa correspondente:
    expect(cutoffAgeFor(selected)).toBe(
      Math.max(
        44 * (Math.LN2 / k) + tmaxMs,
        tmaxMs + MS_PER_DAY,
      ),
    )
  })

  it('absorção instantânea: fração residual em 44 T½ é 2^-44 ≈ 5.6843418861e-14', () => {
    const halfLifeMs = 24 * 3_600_000
    const ke = eliminationRate(halfLifeMs)
    const kinetics: DoseKinetics = { kePerMs: ke, kaPerMs: null }
    const fraction = contributionFromDose(1, 44 * halfLifeMs, kinetics)
    expect(fraction).toBeGreaterThan(0)
    expect(Math.abs(fraction - INSTANT_RESIDUAL_FRACTION) / INSTANT_RESIDUAL_FRACTION).toBeLessThanOrEqual(1e-9)
    expect(fraction).toBeLessThan(CUTOFF_TOLERANCE)
  })
})

describe('E4 cutoff — varredura ampla por q (ambos os lados físicos)', () => {
  it('contribution/dose < CUTOFF_TOLERANCE na idade de corte e depois dela', () => {
    let worstRatio = 0
    let worstQ = 0
    let samples = 0

    for (const q of Q_SWEEP) {
      for (const side of ['faster', 'slower'] as const) {
        // meia-vida base variando por magnitude
        for (const halfLifeMs of [60_000, 3_600_000, 24 * 3_600_000, 180 * 24 * 3_600_000]) {
          const ke = eliminationRate(halfLifeMs)
          const { selected, kinetics } = buildSide(ke, q, side)
           let ageMs: number
           try {
             ageMs = cutoffAgeFor(selected)
           } catch (error) {
             expect((error as { code?: string }).code).toBe('NUMERIC_FAILURE')
             continue
           }

          for (const extra of [0, 0.1 * halfLifeMs, halfLifeMs, 10 * halfLifeMs]) {
            const fraction = contributionFromDose(1, ageMs + extra, kinetics)
            samples++
            if (fraction > worstRatio) {
              worstRatio = fraction
              worstQ = q
            }
            expect(fraction).toBeGreaterThanOrEqual(0)
            expect(fraction).toBeLessThan(CUTOFF_TOLERANCE)
          }
        }
      }
    }

    expect(samples).toBeGreaterThanOrEqual(Q_SWEEP.length * 2 * 4 * 4)
    // Pior razão observada fica registrada no relatório E4 (deve ser << 1e-12).
    expect(worstRatio).toBeLessThan(CUTOFF_TOLERANCE)
    console.info(`[e4-cutoff] pior razão=${worstRatio.toExponential(6)} em q=${worstQ}; amostras=${samples}`)
  })

  it('property log-uniforme: bound mantido para q gerados aleatoriamente quando representável', () => {
    const property = fc.property(
      fc.integer({ min: 3_600_000, max: 90 * MS_PER_DAY }),
      fc.double({ min: Math.log(1 + 1e-12), max: Math.log(1e4), noNaN: true }),
      (halfLifeMs, logQ) => {
        const ke = eliminationRate(halfLifeMs)
        const q = Math.exp(logQ)
        for (const side of ['faster', 'slower'] as const) {
          const { selected, kinetics } = buildSide(ke, q, side)
           let ageMs: number
           try {
             ageMs = cutoffAgeFor(selected)
           } catch (error) {
             expect((error as { code?: string }).code).toBe('NUMERIC_FAILURE')
             return
           }
          if (!Number.isFinite(ageMs)) return
          const fraction = contributionFromDose(1, ageMs, kinetics)
          expect(fraction).toBeLessThan(CUTOFF_TOLERANCE)
        }
      },
    )
    forAllSeeds(property, { numRuns: 200 })
  })

  it('bound agregado: Σ contribuições < CUTOFF_TOLERANCE·Σ doses para D não vazio', () => {
    const property = fc.property(
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 3_600_000, max: 90 * MS_PER_DAY }),
      fc.double({ min: Math.log(1.001), max: Math.log(100), noNaN: true }),
      fc.integer({ min: 0, max: 30 }),
      (count, halfLifeMs, logQ, spreadIdx) => {
        const ke = eliminationRate(halfLifeMs)
        const q = Math.exp(logQ)
        const { selected, kinetics } = buildSide(ke, q, spreadIdx % 2 === 0 ? 'faster' : 'slower')
         let baseAge: number
         try {
           baseAge = cutoffAgeFor(selected)
         } catch (error) {
           expect((error as { code?: string }).code).toBe('NUMERIC_FAILURE')
           return
         }

        let sumContrib = 0
        let sumDose = 0
        for (let i = 0; i < count; i++) {
          const doseMg = 0.001 * (i + 1) * 137
          const age = baseAge * (1 + i * 0.37) + i * halfLifeMs
          sumContrib += contributionFromDose(doseMg, age, kinetics)
          sumDose += doseMg
        }
        expect(sumDose).toBeGreaterThan(0)
        expect(sumContrib).toBeLessThan(CUTOFF_TOLERANCE * sumDose)
      },
    )
    forAllSeeds(property, { numRuns: 150 })
  })

  it('monotonicidade: contribuição não aumenta após o corte (d(contribution)/dt=−ke·central≤0)', () => {
    const property = fc.property(
      fc.integer({ min: 60_000, max: 90 * MS_PER_DAY }),
      fc.option(fc.integer({ min: 900_000, max: 4 * MS_PER_DAY }), { nil: null as null }),
      (halfLifeMs, tmaxMs) => {
        let kaPerMs: number | null
        let kePerMs: number
        try {
          ;({ kaPerMs, kePerMs } = absorptionRateFromTmax({ halfLifeMs, tmaxMs }))
        } catch (error) {
          // Solução de ka não representável é falha normativa, não ponto físico
          // para teste de monotonicidade.
          expect((error as { code?: string }).code).toBe('ABSORPTION_SOLVER_FAILURE')
          return
        }
        const kinetics: DoseKinetics = { kePerMs, kaPerMs }
        const selected: SelectedPkParameters = { halfLifeMs, tmaxMs }
         let ageMs: number
         try {
           ageMs = cutoffAgeFor(selected)
         } catch (error) {
           expect((error as { code?: string }).code).toBe('NUMERIC_FAILURE')
           return
         }
        const terminalHalf = Math.LN2 / Math.min(kePerMs, kaPerMs ?? kePerMs)

        let previous = contributionFromDose(1, ageMs, kinetics)
        for (const factor of [0.1, 1, 10]) {
          const nextAgeMs = ageMs + factor * terminalHalf
          // Se o timestamp posterior não é representável, não há ponto físico
          // avaliável em double; a propriedade é coberta pelos demais pontos.
          if (!Number.isFinite(nextAgeMs)) continue
          const next = contributionFromDose(1, nextAgeMs, kinetics)
          // tolerância numérica minúscula contra ruído de underflow
          expect(next).toBeLessThanOrEqual(previous + previous * 1e-12 + Number.MIN_VALUE)
          previous = next
        }
      },
    )
    forAllSeeds(property, { numRuns: 250 })
  })
})
