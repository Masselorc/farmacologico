import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { stateAt } from '../../../domain/pk/state'
import { amountClose, conservationClose, cutoffClose } from '../../../domain/shared/tolerances'
import { forAllSeeds } from './helpers'

const MS_PER_DAY = 86_400_000

const doseArb = fc.record({
  id: fc.stringMatching(/^d[1-9][0-9]{0,2}$/),
  amountMg: fc.double({ min: 0.001, max: 500_000, noNaN: true }),
  timeMs: fc.integer({ min: 0, max: 60 * MS_PER_DAY }),
})

const paramsArb = fc.record({
  halfLifeMs: fc.integer({ min: 3_600_000, max: 90 * MS_PER_DAY }),
  tmaxMs: fc.option(fc.integer({ min: 900_000, max: 4 * MS_PER_DAY }), { nil: null as null }),
})

function shuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items]
  let state = seed
  for (let i = copy.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) % 2147483648
    const j = state % (i + 1)
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

describe('E4 conservação de massa — property ampla', () => {
  it('administered ≈ central+depot+eliminated em todos os regimes e instantes', () => {
    const property = fc.property(
      paramsArb,
      fc.array(doseArb, { minLength: 1, maxLength: 8 }),
      fc.integer({ min: -MS_PER_DAY, max: 120 * MS_PER_DAY }),
      ({ halfLifeMs, tmaxMs }, doses, nowMs) => {
        const state = stateAt(doses, nowMs, halfLifeMs, tmaxMs)
        expect(
          conservationClose(
            state.administeredMg,
            state.centralMg + state.depotMg + state.eliminatedMg,
          ),
        ).toBe(true)

        // Doses futuras não contaminam o estado físico.
        const future = doses.filter((d) => d.timeMs > nowMs)
        if (future.length > 0) {
          expect(state.plannedCount).toBe(future.length)
          const withoutFuture = doses.filter((d) => d.timeMs <= nowMs)
          const reference =
            withoutFuture.length === 0
              ? null
              : stateAt(withoutFuture, nowMs, halfLifeMs, tmaxMs)
          if (reference !== null) {
            expect(amountClose(state.centralMg, reference.centralMg)).toBe(true)
            expect(amountClose(state.depotMg, reference.depotMg)).toBe(true)
            expect(state.administeredCount).toBe(reference.administeredCount)
          }
        }

        // Percentuais: frações finitas ≥0 somando ≈1 quando há massa administrada.
        const percents = [state.centralPercent, state.depotPercent, state.eliminatedPercent]
        if (state.administeredMg <= 0) {
          for (const p of percents) expect(p).toBe(0)
        } else {
          for (const p of percents) {
            expect(Number.isFinite(p)).toBe(true)
            expect(p).toBeGreaterThanOrEqual(0)
          }
          expect(Math.abs(percents.reduce((a, b) => a + b, 0) - 1)).toBeLessThanOrEqual(1e-12)
        }
      },
    )
    forAllSeeds(property, { numRuns: 400 })
  })

  it('superposição é invariante à permutação e linear nos compartimentos', () => {
    const property = fc.property(
      paramsArb,
      fc.array(doseArb, { minLength: 2, maxLength: 6 }),
      fc.integer({ min: 0, max: 2000000000 }),
      fc.integer({ min: 1, max: 2147483647 }),
      ({ halfLifeMs, tmaxMs }, doses, nowMs, seed) => {
        const base = stateAt(doses, nowMs, halfLifeMs, tmaxMs)
        const permuted = stateAt(shuffle(doses, seed), nowMs, halfLifeMs, tmaxMs)

        expect(amountClose(base.administeredMg, permuted.administeredMg)).toBe(true)
        expect(amountClose(base.centralMg, permuted.centralMg)).toBe(true)
        expect(amountClose(base.depotMg, permuted.depotMg)).toBe(true)
        expect(base.administeredCount).toBe(permuted.administeredCount)
        expect(base.plannedCount).toBe(permuted.plannedCount)

        // Linearidade: estado(A∪B) ≈ estado(A)+estado(B).
        const halfA = doses.slice(0, Math.floor(doses.length / 2))
        const halfB = doses.slice(Math.floor(doses.length / 2))
        const stateA = stateAt(halfA, nowMs, halfLifeMs, tmaxMs)
        const stateB = stateAt(halfB, nowMs, halfLifeMs, tmaxMs)

        // Linearidade aditiva nos compartimentos primários físicos e na massa administrada:
        expect(amountClose(base.administeredMg, stateA.administeredMg + stateB.administeredMg)).toBe(true)
        expect(amountClose(base.centralMg, stateA.centralMg + stateB.centralMg)).toBe(true)
        expect(amountClose(base.depotMg, stateA.depotMg + stateB.depotMg)).toBe(true)

        // Conservação dentro de cada universo (nunca comparar counts entre universos distintos).
        for (const s of [base, stateA, stateB]) {
          expect(
            conservationClose(s.administeredMg, s.centralMg + s.depotMg + s.eliminatedMg),
          ).toBe(true)
        }
      },
    )
    forAllSeeds(property, { numRuns: 300 })
  })
})

describe('E4 percentuais — caso degenerado subnormal (regressão do gate)', () => {
  it('dose subnormal não produz NaN/Infinity nos percentuais', () => {
    const state = stateAt([{ id: 'sub', amountMg: Number.MIN_VALUE, timeMs: 0 }], 0, MS_PER_DAY, null)
    expect(Number.isFinite(state.centralPercent)).toBe(true)
    expect(state.centralPercent).toBe(1)
    expect(state.eliminatedPercent).toBe(0)
  })
})

describe('E4 cutoffClose — contratos diretos', () => {
  it('budget=0 ⇒ exatamente equivalente a amountClose', () => {
    const property = fc.property(
      fc.double({ min: 0, max: 1e6, noNaN: true }),
      fc.double({ min: 0, max: 1e6, noNaN: true }),
      (a, b) => {
        expect(cutoffClose(a, b, 0)).toBe(amountClose(a, b))
      },
    )
    forAllSeeds(property, { numRuns: 300 })
  })

  it('100 mg descartados no pior caso degenerado: resíduo ≈6.795927e-11 mg cabe no orçamento', () => {
    const residualWorstCase = 6.7959269753e-13 * 100
    const a = 0
    const b = residualWorstCase
    expect(cutoffClose(a, b, 100)).toBe(true)
    // Sem orçamento físico, a mesma diferença NÃO seria tolerada como erro numérico:
    expect(residualWorstCase).toBeGreaterThan(1e-12 + 1e-9 * residualWorstCase)
  })

  it('fora do orçamento ⇒ false; budget usa SOMA das doses descartadas', () => {
    // diferença 1e-5 mg; budget com 100 mg descartados = 1e-10 mg ⇒ rejeita.
    expect(cutoffClose(0, 1e-5, 100)).toBe(false)
    // Mesma diferença com 1e7 mg descartados (budget 1e-5) ⇒ aceita na fronteira.
    expect(cutoffClose(0, 1e-5, 1e7)).toBe(true)
  })
})
