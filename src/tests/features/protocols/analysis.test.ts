import { describe, expect, it } from 'vitest'
import { analyzeProtocolsLive } from '../../../features/protocols/lib/analysis'
import type { DisplayWindow, Protocol } from '../../../domain/types'

describe('protocols/lib/analysis', () => {
  const displayWindow: DisplayWindow = {
    startMs: 1788134400000, // 2026-09-01T00:00:00Z
    endMs: 1790726400000, // 2026-10-01T00:00:00Z
  }
  const nowMs = 1788220800000 // 2026-09-02T00:00:00Z

  it('blend gera exatamente 1 SimulationInput e 1 série por componente com doses proporcionais', () => {
    // Exemplo normativo: Blend Landergold 250 mg com 3 componentes
    const blendProtocol: Protocol = {
      id: 'proto-blend-lander',
      name: 'Blend Landergold',
      totalDoseMg: 250,
      schedule: {
        startDate: '2026-09-01',
        localTime: '08:00',
        timeZone: 'UTC',
        recurrence: {
          type: 'weekly',
          weekdays: [2], // Terça-feira
          weeks: 4,
        },
      },
      components: [
        {
          id: 'c-prop',
          label: 'Testosterona Propionato',
          proportion: 0.12, // 30 mg / 250 mg
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 19 * 3600000, tmaxMs: 12 * 3600000 },
          pkParametersSnapshot: {
            halfLife: { value: 19, unit: 'hours' },
            tmax: { value: 12, unit: 'hours' },
          },
          displayColor: { paletteColor: '#2563eb' },
        },
        {
          id: 'c-fen',
          label: 'Testosterona Fenilpropionato',
          proportion: 0.24, // 60 mg / 250 mg
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 3 * 86400000, tmaxMs: 24 * 3600000 },
          pkParametersSnapshot: {
            halfLife: { value: 3, unit: 'days' },
            tmax: { value: 24, unit: 'hours' },
          },
          displayColor: { paletteColor: '#059669' },
        },
        {
          id: 'c-cip',
          label: 'Testosterona Cipionato',
          proportion: 0.64, // 160 mg / 250 mg
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 8 * 86400000, tmaxMs: 48 * 3600000 },
          pkParametersSnapshot: {
            halfLife: { value: 8, unit: 'days' },
            tmax: { value: 48, unit: 'hours' },
          },
          displayColor: { paletteColor: '#d97706' },
        },
      ],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    }

    const analysis = analyzeProtocolsLive([blendProtocol], displayWindow, nowMs)

    // Exatamente 3 séries geradas
    expect(analysis.series).toHaveLength(3)

    // Nenhuma média de meia-vida
    const propSeries = analysis.series.find((s) => s.componentId === 'c-prop')!
    const fenSeries = analysis.series.find((s) => s.componentId === 'c-fen')!
    const cipSeries = analysis.series.find((s) => s.componentId === 'c-cip')!

    expect(propSeries.input.halfLifeMs).toBe(19 * 3600000)
    expect(fenSeries.input.halfLifeMs).toBe(3 * 86400000)
    expect(cipSeries.input.halfLifeMs).toBe(8 * 86400000)

    // Doses calculadas proporcionalmente: totalDoseMg * proportion
    expect(propSeries.input.doses[0]!.amountMg).toBeCloseTo(30, 4)
    expect(fenSeries.input.doses[0]!.amountMg).toBeCloseTo(60, 4)
    expect(cipSeries.input.doses[0]!.amountMg).toBeCloseTo(160, 4)

    // Chaves de série canônicas
    expect(propSeries.key).toEqual({ protocolId: 'proto-blend-lander', componentId: 'c-prop' })

    // Limite de 1200 pontos de amostragem por série
    for (const s of analysis.series) {
      expect(s.displayPoints.length).toBeLessThanOrEqual(1200)
    }

    // Guias temporais de administrações na DisplayWindow
    expect(analysis.temporalGuides.length).toBeGreaterThan(0)
    for (const g of analysis.temporalGuides) {
      expect(g.instantMs).toBeGreaterThanOrEqual(displayWindow.startMs)
      expect(g.instantMs).toBeLessThan(displayWindow.endMs)
    }
  })
})
