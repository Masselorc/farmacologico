import { describe, expect, it } from 'vitest'
import { LOG_REL_EPSILON } from '../../../domain/shared/tolerances'
import type { DisplayPoint, SimulationOutput } from '../../../domain/types'
import { createChartSnapshotPoints } from '../../../features/comparator/lib/chartView'

describe('createChartSnapshotPoints (§15, E9)', () => {
  const mockResult: SimulationOutput = {
    currentState: {
      administeredMg: 100,
      centralMg: 10,
      depotMg: 0,
      eliminatedMg: 90,
      administeredCount: 1,
      plannedCount: 0,
      centralPercent: 10,
      depotPercent: 0,
      eliminatedPercent: 90,
    },
    analysisCurve: [],
    peak: { timeMs: 2000, amountMg: 100 }, // Peak = 100 mg
    milestones: [],
    administrations: [],
    warnings: [],
    metadata: {
      pkEngineVersion: '1.0.0',
      kePerMs: 0.001,
      kaPerMs: 0.005,
      terminalHalfLifeMs: 693147,
      horizonEndMs: 5000,
      analysisCurveSteps: 100,
      contributionCutoffHalfLives: 44,
      contributionCutoffAgeMs: 30498476,
    },
  }

  const displayPoints: DisplayPoint[] = [
    { timeMs: 1000, amountMg: 100 }, // pico
    { timeMs: 2000, amountMg: 50 }, // 50 mg
    { timeMs: 3000, amountMg: 100 * 1e-12 }, // exatamente no floor do log
    { timeMs: 4000, amountMg: 100 * 1e-13 }, // abaixo do floor
    { timeMs: 5000, amountMg: 0 }, // zero
  ]

  it('gera pontos Absolute Linear com valueKind mg sem clipping', () => {
    const points = createChartSnapshotPoints({
      displayPoints,
      result: mockResult,
      scaleMode: 'absolute',
      yAxisMode: 'linear',
    })

    expect(points).toHaveLength(5)
    expect(points[0]).toEqual({ timeMs: 1000, value: 100, valueKind: 'mg' })
    expect(points[1]).toEqual({ timeMs: 2000, value: 50, valueKind: 'mg' })
    expect(points.every((p) => p.valueKind === 'mg')).toBe(true)
    expect(points.some((p) => p.clippedBelowLogEpsilon)).toBe(false)
  })

  it('gera pontos Absolute Log preservando os valores numéricos com flags de clipping corretas', () => {
    const points = createChartSnapshotPoints({
      displayPoints,
      result: mockResult,
      scaleMode: 'absolute',
      yAxisMode: 'log',
    })

    expect(points[0]).toEqual({
      timeMs: 1000,
      value: 100,
      valueKind: 'mg',
      clippedBelowLogEpsilon: false,
    })
    expect(points[1]).toEqual({
      timeMs: 2000,
      value: 50,
      valueKind: 'mg',
      clippedBelowLogEpsilon: false,
    })
    // Exatamente no floor (100 * 1e-12)
    expect(points[2].clippedBelowLogEpsilon).toBe(true)
    expect(points[2].value).toBe(100 * 1e-12) // valor científico preservado!
    // Abaixo do floor
    expect(points[3].clippedBelowLogEpsilon).toBe(true)
    expect(points[3].value).toBe(100 * 1e-13)
    // Zero
    expect(points[4].clippedBelowLogEpsilon).toBe(true)
    expect(points[4].value).toBe(0)
  })

  it('gera pontos Normalized Linear usando EXCLUSIVAMENTE result.peak.amountMg como denominador', () => {
    // Caso onde o ponto visível máximo na janela é 50 mg (menor que o pico global do resultado de 100 mg)
    const windowPoints: DisplayPoint[] = [
      { timeMs: 2000, amountMg: 50 },
      { timeMs: 2500, amountMg: 25 },
    ]

    const points = createChartSnapshotPoints({
      displayPoints: windowPoints,
      result: mockResult,
      scaleMode: 'normalized',
      yAxisMode: 'linear',
    })

    // 50 / 100 = 0.5 (e NÃO 50 / 50 = 1.0)
    expect(points[0]).toEqual({
      timeMs: 2000,
      value: 0.5,
      valueKind: 'normalized_ratio',
    })
    expect(points[1]).toEqual({
      timeMs: 2500,
      value: 0.25,
      valueKind: 'normalized_ratio',
    })
  })

  it('gera pontos Normalized Log com floor = LOG_REL_EPSILON e clipping adequado', () => {
    const points = createChartSnapshotPoints({
      displayPoints,
      result: mockResult,
      scaleMode: 'normalized',
      yAxisMode: 'log',
    })

    expect(points[0].value).toBe(1)
    expect(points[0].clippedBelowLogEpsilon).toBe(false)
    expect(points[1].value).toBe(0.5)
    expect(points[1].clippedBelowLogEpsilon).toBe(false)
    // 100 * 1e-12 / 100 = 1e-12 (floor)
    expect(points[2].value).toBe(LOG_REL_EPSILON)
    expect(points[2].clippedBelowLogEpsilon).toBe(true)
  })
})
