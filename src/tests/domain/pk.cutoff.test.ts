import { describe, expect, it } from 'vitest'
import {
  CONTRIBUTION_CUTOFF_HALF_LIVES,
  cutoffAgeFor,
  effectiveTmaxMs,
  terminalHalfLifeMsOf,
} from '../../domain/pk/cutoff'
import { amountClose, conservationClose, cutoffClose, proportionSumClose } from '../../domain/shared/tolerances'
import { requiredPkLookback } from '../../domain/simulation/windows'

const MS_PER_DAY = 86_400_000

describe('cutoff — política única', () => {
  it('constante normativa é 44', () => {
    expect(CONTRIBUTION_CUTOFF_HALF_LIVES).toBe(44)
  })

  it('effectiveTmax usa ?? 0 (null e 0 equivalentes; demais valores preservados)', () => {
    expect(effectiveTmaxMs({ halfLifeMs: 1_000, tmaxMs: null })).toBe(0)
    expect(effectiveTmaxMs({ halfLifeMs: 1_000, tmaxMs: 0 })).toBe(0)
    expect(effectiveTmaxMs({ halfLifeMs: 1_000, tmaxMs: 5 })).toBe(5)
  })

  it('instantânea: cutoffAge = 44·T½ (domina MS_PER_DAY)', () => {
    const age = cutoffAgeFor({ halfLifeMs: 6 * MS_PER_DAY, tmaxMs: null })
    expect(age).toBe(44 * 6 * MS_PER_DAY)
  })

  it('finita flip-flop: cutoffAge coerente com a fórmula max(...)', () => {
    const selected = { halfLifeMs: 6 * MS_PER_DAY, tmaxMs: 12 * MS_PER_DAY }
    const terminalHalfLifeMs = terminalHalfLifeMsOf(selected)
    const effTmax = effectiveTmaxMs(selected)
    const expected = Math.max(
      44 * terminalHalfLifeMs + effTmax,
      effTmax + MS_PER_DAY,
    )
    expect(cutoffAgeFor(selected)).toBe(expected)
    expect(Number.isFinite(cutoffAgeFor(selected))).toBe(true)
  })

  it('requiredPkLookback === max(cutoffAgeFor) — invariante testada', () => {
    const params = [
      { halfLifeMs: 6 * MS_PER_DAY, tmaxMs: null },
      { halfLifeMs: 30 * 60_000, tmaxMs: 2 * 60_000 },
      { halfLifeMs: 12 * MS_PER_DAY, tmaxMs: null },
    ]
    const ages = params.map((p) => cutoffAgeFor(p))
    expect(requiredPkLookback(params)).toBe(Math.max(...ages))
    expect(requiredPkLookback([])).toBe(0)
  })
})

describe('tolerâncias — amount/conservation/proportion/cutoff', () => {
  it('cutoffClose(x,x,0) sempre verdadeiro', () => {
    expect(cutoffClose(3.25, 3.25, 0)).toBe(true)
    expect(cutoffClose(0, 0, 0)).toBe(true)
  })

  it('invariante: sumDiscardedDoseMg=0 ⇒ cutoffClose ≡ amountClose', () => {
    const pairs: Array<[number, number]> = [
      [1, 1 + 5e-10],
      [1e-13, 0],
      [7.7, 7.700001],
      [1, 2],
    ]
    for (const [a, b] of pairs) {
      expect(cutoffClose(a, b, 0)).toBe(amountClose(a, b))
    }
  })

  it('orçamento físico do truncamento amplia a tolerância proporcionalmente à dose descartada', () => {
    const a = 1
    const b = 1 + 1e-6
    expect(amountClose(a, b)).toBe(false)
    // budget = CUTOFF_TOLERANCE·sumDiscardedDoseMg = 1e-12·1e6 = 1e-6 ⇒ passa
    expect(cutoffClose(a, b, 1e6)).toBe(true)
  })

  it('proportionSumClose usa ATOL adimensional, não igualdade crua', () => {
    expect(proportionSumClose([0.2, 0.3, 0.5])).toBe(true)
    // desvio de 1e-15 é aceito pelo ATOL=1e-12 (igualdade crua rejeitaria)
    expect(proportionSumClose([0.5, 0.5, 1e-15])).toBe(true)
    expect(proportionSumClose([0.55, 0.5])).toBe(false)
    expect(conservationClose(100, 100)).toBe(true)
    expect(conservationClose(100, 100.0000001)).toBe(true)
    expect(conservationClose(100, 101)).toBe(false)
  })
})
