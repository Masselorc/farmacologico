import { describe, expect, it } from 'vitest'
import { evaluateDayProtocolEstimates } from '../../../features/protocols/lib/estimates'
import type { Protocol } from '../../../domain/types'

describe('protocols/lib/estimates', () => {
  const timeZone = 'America/Sao_Paulo'

  const baseProtocol: Protocol = {
    id: 'proto-august',
    name: 'Protocolo Agosto',
    totalDoseMg: 100,
    schedule: {
      startDate: '2026-08-25',
      localTime: '08:00',
      timeZone: 'America/Sao_Paulo',
      recurrence: { type: 'single' },
    },
    components: [
      {
        id: 'comp-1',
        label: 'Substância A',
        proportion: 1,
        source: { type: 'manual' },
        selectedPkParameters: { halfLifeMs: 5 * 86400000, tmaxMs: 1 * 86400000 },
        pkParametersSnapshot: {
          halfLife: { value: 5, unit: 'days' },
          tmax: { value: 1, unit: 'days' },
        },
        displayColor: { paletteColor: '#2563eb' },
      },
    ],
    createdAt: '2026-08-25T00:00:00Z',
    updatedAt: '2026-08-25T00:00:00Z',
  }

  it('dose do mês anterior (25/08) contribui nas estimativas de setembro (01/09 às 20:00)', () => {
    const estimates = evaluateDayProtocolEstimates([baseProtocol], '2026-09-01', timeZone)
    expect(estimates).toHaveLength(1)
    expect(estimates[0]!.protocolId).toBe('proto-august')
    expect(estimates[0]!.estimatedMg).toBeGreaterThan(0.01)
  })

  it('soma centralMg de múltiplos componentes de um blend', () => {
    const blendProtocol: Protocol = {
      id: 'proto-blend',
      name: 'Blend Triplo',
      totalDoseMg: 300,
      schedule: {
        startDate: '2026-09-01',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'single' },
      },
      components: [
        {
          id: 'c1',
          label: 'Comp 1',
          proportion: 0.5,
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 2 * 86400000, tmaxMs: 0.5 * 86400000 },
          pkParametersSnapshot: {
            halfLife: { value: 2, unit: 'days' },
            tmax: { value: 12, unit: 'hours' },
          },
          displayColor: { paletteColor: '#2563eb' },
        },
        {
          id: 'c2',
          label: 'Comp 2',
          proportion: 0.5,
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 7 * 86400000, tmaxMs: 2 * 86400000 },
          pkParametersSnapshot: {
            halfLife: { value: 7, unit: 'days' },
            tmax: { value: 2, unit: 'days' },
          },
          displayColor: { paletteColor: '#059669' },
        },
      ],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    }

    const estimates = evaluateDayProtocolEstimates([blendProtocol], '2026-09-01', timeZone)
    expect(estimates).toHaveLength(1)
    expect(estimates[0]!.estimatedMg).toBeGreaterThan(50)
  })

  it('corte estrito oculta estimativas < 0.01 mg', () => {
    // Protocolo administrado há 50 meias-vidas (quantidade residual < 0.0001 mg)
    const traceProtocol: Protocol = {
      id: 'proto-trace',
      name: 'Trace',
      totalDoseMg: 10,
      schedule: {
        startDate: '2026-01-01',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'single' },
      },
      components: [
        {
          id: 'c1',
          label: 'Rápido',
          proportion: 1,
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 1 * 86400000, tmaxMs: null },
          pkParametersSnapshot: {
            halfLife: { value: 1, unit: 'days' },
            tmax: null,
          },
          displayColor: { paletteColor: '#2563eb' },
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    const estimates = evaluateDayProtocolEstimates([traceProtocol], '2026-09-01', timeZone)
    expect(estimates).toHaveLength(0)
  })

  it('ordena estimativas por estimatedMg decrescente', () => {
    const protoSmall: Protocol = {
      ...baseProtocol,
      id: 'proto-small',
      name: 'Pequeno',
      totalDoseMg: 10,
      schedule: {
        startDate: '2026-09-01',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'single' },
      },
    }
    const protoLarge: Protocol = {
      ...baseProtocol,
      id: 'proto-large',
      name: 'Grande',
      totalDoseMg: 500,
      schedule: {
        startDate: '2026-09-01',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'single' },
      },
    }

    const estimates = evaluateDayProtocolEstimates([protoSmall, protoLarge], '2026-09-01', timeZone)
    expect(estimates).toHaveLength(2)
    expect(estimates[0]!.protocolId).toBe('proto-large')
    expect(estimates[1]!.protocolId).toBe('proto-small')
    expect(estimates[0]!.estimatedMg).toBeGreaterThan(estimates[1]!.estimatedMg)
  })
})
