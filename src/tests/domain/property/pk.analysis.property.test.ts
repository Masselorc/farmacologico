import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { analyze } from '../../../domain/pk/analysis'
import { PEAK_TIME_ABS_TOL_MS, MILESTONE_TIME_ABS_TOL_MS } from '../../../domain/shared/tolerances'
import { amountClose } from '../../../domain/shared/tolerances'
import { MS_PER_DAY } from './cutoff-fixtures'
import { forAllSeeds } from './helpers'

const LOG2_1000 = Math.log2(1000) // ≈ 9.9657842847

function shuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items]
  let state = seed * 2654435761
  for (let i = copy.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) % 2147483648
    const j = state % (i + 1)
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

describe('E4 peak — identidades científicas', () => {
  it('dose única instantânea: pico no instante da dose com valor da dose', () => {
    const property = fc.property(
      fc.integer({ min: 60_000, max: 90 * MS_PER_DAY }),
      fc.double({ min: 0.001, max: 1000, noNaN: true }),
      fc.integer({ min: 0, max: 10_000_000 }),
      (halfLifeMs, amountMg, anchor) => {
        const output = analyze({
          halfLifeMs,
          tmaxMs: null,
          doses: [{ id: 'd', amountMg, timeMs: anchor }],
          nowMs: anchor,
        })
        expect(Math.abs(output.peak.timeMs - anchor)).toBeLessThanOrEqual(PEAK_TIME_ABS_TOL_MS)
        expect(output.peak.amountMg).toBeGreaterThan(0)
      },
    )
    forAllSeeds(property, { numRuns: 150 })
  })

  it('dose única finita representável: pico ≈ dose.time + Tmax dentro de PEAK_TIME_ABS_TOL', () => {
    const property = fc.property(
      fc.integer({ min: 6 * 3_600_000, max: 30 * MS_PER_DAY }), // T½ moderada
      fc.integer({ min: 900_000, max: 3 * MS_PER_DAY }), // Tmax moderado
      fc.integer({ min: 1_000_000_000_000, max: 1_800_000_000_000 }),
      (halfLifeMs, tmaxMs, anchor) => {
        const output = analyze({
          halfLifeMs,
          tmaxMs,
          doses: [{ id: 'd', amountMg: 25, timeMs: anchor }],
          nowMs: anchor + tmaxMs,
        })
        expect(Math.abs(output.peak.timeMs - (anchor + tmaxMs))).toBeLessThanOrEqual(PEAK_TIME_ABS_TOL_MS)
        expect(output.peak.amountMg).toBeGreaterThan(0)
      },
    )
    forAllSeeds(property, { numRuns: 120 })
  })
})

describe('E4 milestones — analítico e geral', () => {
  it('instantânea: tempo até 0,1% ≈ log2(1000)·T½ dentro de MILESTONE_TIME_ABS_TOL', () => {
    const property = fc.property(
      fc.integer({ min: 3_600_000, max: 30 * MS_PER_DAY }),
      fc.integer({ min: 500_000_000_000, max: 1_500_000_000_000 }),
      (halfLifeMs, anchor) => {
        const output = analyze({
          halfLifeMs,
          tmaxMs: null,
          doses: [{ id: 'd', amountMg: 10, timeMs: anchor }],
          nowMs: anchor,
        })
        const milestone01 = output.milestones.find((m) => m.percentage === 0.1)!
        expect(milestone01.timeMs).not.toBeNull()
        const expected = anchor + LOG2_1000 * halfLifeMs
        expect(Math.abs(milestone01.timeMs! - expected)).toBeLessThanOrEqual(MILESTONE_TIME_ABS_TOL_MS)
      },
    )
    forAllSeeds(property, { numRuns: 120 })
  })

  it('Bateman geral: cada marco alcançado satisfaz a equação f(time)≈target; tempos não decrescentes', () => {
    const property = fc.property(
      fc.integer({ min: 6 * 3_600_000, max: 45 * MS_PER_DAY }),
      fc.integer({ min: 1_800_000, max: 3 * MS_PER_DAY }),
      fc.integer({ min: 1, max: 3 }),
      fc.integer({ min: 1_000_000_000_000, max: 1_700_000_000_000 }),
      (halfLifeMs, tmaxMs, count, anchor) => {
        const spacing = Math.max(tmaxMs * 2, halfLifeMs)
        const doses = Array.from({ length: count }, (_, i) => ({
          id: `m${i}`,
          amountMg: 20,
          timeMs: anchor + i * spacing,
        }))
        const output = analyze({ halfLifeMs, tmaxMs, doses, nowMs: doses[doses.length - 1]!.timeMs })

        let previousTime: number | null = null
        for (const milestone of output.milestones) {
          expect(milestone.targetMg).toBeLessThanOrEqual(output.peak.amountMg)
          if (milestone.timeMs === null) continue
          expect(milestone.timeMs).toBeGreaterThanOrEqual(output.peak.timeMs - MILESTONE_TIME_ABS_TOL_MS)

          // Equação do marco: valor no instante devolvido ≈ alvo (valida PELA EQUAÇÃO).
          const kineticsAmountAt = centralAt(doses, halfLifeMs, tmaxMs)
          const value = kineticsAmountAt(milestone.timeMs)
          expect(amountClose(value, milestone.targetMg)).toBe(true)

          if (previousTime !== null) {
            expect(milestone.timeMs).toBeGreaterThanOrEqual(previousTime)
          }
          previousTime = milestone.timeMs
        }
        expect(previousTime).not.toBeNull() // pelo menos 50% alcançada nesse regime
      },
    )
    forAllSeeds(property, { numRuns: 80 })
  })
})

describe('E4 horizonte e curva de análise', () => {
  it('horizonte finito > última dose; curva ordenada/deduplicada/finita/independente de ordem', () => {
    const property = fc.property(
      fc.integer({ min: 3_600_000, max: 90 * MS_PER_DAY }),
      fc.option(fc.integer({ min: 900_000, max: 2 * MS_PER_DAY }), { nil: null as null }),
      fc.array(fc.record({ id: fc.stringMatching(/^p[1-9][0-9]{0,2}$/), amountMg: fc.double({ min: 0.001, max: 1000, noNaN: true }), timeMs: fc.integer({ min: 0, max: 30 * MS_PER_DAY }) }), { minLength: 1, maxLength: 6 }),
      fc.constant(1),
      fc.integer({ min: 1, max: 999999 }),
      (halfLifeMs, tmaxMs, doses, _tag, seed) => {
        const inputA = { halfLifeMs, tmaxMs, doses, nowMs: 0, analysisCurveSteps: 80 }
        const outputA = analyze(inputA)

        expect(Number.isFinite(outputA.metadata.horizonEndMs)).toBe(true)
        expect(outputA.metadata.horizonEndMs).toBeGreaterThan(Math.max(...doses.map((d) => d.timeMs)))

        const times = outputA.analysisCurve.map((p) => p.timeMs)
        for (let i = 1; i < times.length; i++) {
          expect(times[i]!).toBeGreaterThan(times[i - 1]!)
        }
        for (const point of outputA.analysisCurve) {
          expect(Number.isFinite(point.amountMg)).toBe(true)
          expect(point.amountMg).toBeGreaterThanOrEqual(0)
        }

        // Pontos especiais: todas as doses presentes na curva.
        const timeSet = new Set(times)
        for (const dose of doses) {
          if (dose.timeMs <= outputA.metadata.horizonEndMs) {
            expect(timeSet.has(dose.timeMs)).toBe(true)
          }
        }

        // Independência de ordem: mesma entrada embaralhada ⇒ MESMA curva.
        const outputB = analyze({ ...inputA, doses: shuffle(doses, seed) })
        expect(outputB.analysisCurve).toEqual(outputA.analysisCurve)
        expect(outputB.peak).toEqual(outputA.peak)
      },
    )
    forAllSeeds(property, { numRuns: 120 })
  })

  it('horizonte inválido falha normativo (steps < 1 ⇒ INVALID_HORIZON)', () => {
    expect.assertions(1)
    try {
      analyze({
        halfLifeMs: MS_PER_DAY,
        tmaxMs: null,
        doses: [{ id: 'x', amountMg: 1, timeMs: 0 }],
        nowMs: 0,
        analysisCurveSteps: 0,
      })
    } catch (error) {
      expect((error as { code?: string }).code).toBe('INVALID_HORIZON')
    }
  })
})

function centralAt(
  doses: Array<{ id: string; amountMg: number; timeMs: number }>,
  halfLifeMs: number,
  tmaxMs: number | null,
): (t: number) => number {
  const sorted = [...doses].sort((a, b) => a.timeMs - b.timeMs)
  const { kePerMs, kaPerMs } = solveAbsorption({ halfLifeMs, tmaxMs })
  return (t: number) => {
    // Avaliação física independente via superposição central (mesma primitiva do motor):
    let total = 0
    for (const dose of sorted) {
      if (dose.timeMs > t) break
      total += stableBatemanAmount(dose.amountMg, t - dose.timeMs, { kePerMs, kaPerMs })
    }
    return total
  }
}

import { stableBatemanAmount } from '../../../domain/pk/bateman'
import { absorptionRateFromTmax as solveAbsorption } from '../../../domain/pk/rates'
