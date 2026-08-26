import { describe, expect, it } from 'vitest'
import { analyze } from '../../../domain/pk/analysis'
import { stateAt } from '../../../domain/pk/state'
import { cutoffAgeFor } from '../../../domain/pk/cutoff'

// Regressões E4: counterexamples reduzidos descobertos pelo gate matemático.
// Cada entrada aqui é permanente e coberta por `npm test` no CI.

describe('regressão E4 — percentuais com dose subnormal', () => {
  // Counterexample: stateAt/administeredMg = Number.MIN_VALUE (5e-324).
  // Causa: percentuais calculados por multiplicação com fator 1/adm ⇒ Infinity ⇒ NaN.
  // Correção: razão por divisão direta em pkStateFromTotals (state.ts), reutilizada por analyze.
  it('stateAt com dose subnormal mantém percentuais finitos somando 1', () => {
    const state = stateAt([{ id: 's', amountMg: Number.MIN_VALUE, timeMs: 0 }], 0, 86_400_000, null)
    expect(Number.isFinite(state.centralPercent)).toBe(true)
    expect(Number.isFinite(state.depotPercent)).toBe(true)
    expect(Number.isFinite(state.eliminatedPercent)).toBe(true)
    expect(state.centralPercent + state.depotPercent + state.eliminatedPercent).toBeCloseTo(1, 9)
  })

  it('analyze propaga a correção via currentState', () => {
    const output = analyze({
      halfLifeMs: 86_400_000,
      tmaxMs: null,
      doses: [{ id: 'tiny', amountMg: Number.MIN_VALUE, timeMs: 1_000 }],
      nowMs: 1_000,
    })
    expect(Number.isFinite(output.currentState.centralPercent)).toBe(true)
    expect(output.currentState.administeredCount).toBe(1)
  })
})

describe('regressão E4 — cutoff não representável', () => {
  it('não devolve Infinity silencioso quando 44·T½terminal transborda', () => {
    expect(() => cutoffAgeFor({ halfLifeMs: 60000, tmaxMs: 60160074 })).toThrowError(
      expect.objectContaining({ code: 'NUMERIC_FAILURE' }),
    )
  })
})
