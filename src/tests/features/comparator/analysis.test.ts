import { describe, expect, it } from 'vitest'
import { MS_PER_DAY } from '../../../domain/units/convert'
import type { DisplayWindow, Scenario } from '../../../domain/types'
import { analyzeScenario } from '../../../features/comparator/lib/analysis'

describe('analyzeScenario Pipeline (§7, §15, E9)', () => {
  const displayWindow: DisplayWindow = {
    startMs: 1_700_000_000_000,
    endMs: 1_700_000_000_000 + 30 * MS_PER_DAY,
  }
  const nowMs = 1_700_000_000_000

  it('analisa cenário âncora 6d / 2d com Tmax resolvido corretamente', () => {
    const scenario: Scenario = {
      id: 'sc-anchor',
      name: 'Semaglutida Anchor',
      color: '#2563eb',
      source: { type: 'manual' },
      displayUnit: 'mg',
      selectedPkParameters: {
        halfLifeMs: 6 * MS_PER_DAY,
        tmaxMs: 2 * MS_PER_DAY,
      },
      doses: [
        { id: 'd-1', amountMg: 1, time: '2023-11-14T22:13:20Z' }, // timeMs = 1700000000000
      ],
    }

    const result = analyzeScenario(scenario, displayWindow, nowMs, 'absolute', 'linear')
    expect(result.status).toBe('success')
    if (result.status !== 'success') return

    const { data } = result
    expect(data.result.peak.amountMg).toBeGreaterThan(0)
    expect(data.displayPoints.length).toBeGreaterThan(0)

    // ka em 1/dia aproximadamente 1.3416 / dia
    const kaPerDay = (data.result.metadata.kaPerMs ?? 0) * MS_PER_DAY
    expect(kaPerDay).toBeCloseTo(1.3416, 2)
  })

  it('retorna no_contributing_doses quando as doses estão fora do horizonte de cutoff', () => {
    const scenario: Scenario = {
      id: 'sc-old',
      name: 'Cenário Doses Antigas',
      color: '#059669',
      source: { type: 'manual' },
      displayUnit: 'mg',
      selectedPkParameters: {
        halfLifeMs: 1 * MS_PER_DAY, // cutoff = 44 dias
        tmaxMs: null,
      },
      doses: [
        { id: 'd-ancient', amountMg: 10, time: '2020-01-01T00:00:00Z' }, // anos atrás
      ],
    }

    const result = analyzeScenario(scenario, displayWindow, nowMs, 'absolute', 'linear')
    expect(result.status).toBe('no_contributing_doses')
  })

  it('emite warning FLIP_FLOP_ABSORPTION quando aplicável sem quebrar a simulação', () => {
    // Parâmetros onde ka < ke (absorção mais lenta que eliminação)
    const scenario: Scenario = {
      id: 'sc-flipflop',
      name: 'Flip-Flop Scenario',
      color: '#d97706',
      source: { type: 'manual' },
      displayUnit: 'mg',
      selectedPkParameters: {
        halfLifeMs: 1 * MS_PER_DAY,
        tmaxMs: 5 * MS_PER_DAY,
      },
      doses: [{ id: 'd-1', amountMg: 10, time: '2023-11-14T22:13:20Z' }],
    }

    const result = analyzeScenario(scenario, displayWindow, nowMs, 'absolute', 'linear')
    expect(result.status).toBe('success')
    if (result.status !== 'success') return

    expect(result.data.result.warnings).toContain('FLIP_FLOP_ABSORPTION')
  })
})
