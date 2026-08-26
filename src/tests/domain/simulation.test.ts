import { describe, expect, it } from 'vitest'
import { assembleProtocolInputs, assembleScenarioInputs, instantIsoToEpochMs, selectRelevantScenarioDoses } from '../../domain/simulation/assemble'
import { deriveCalculationWindow, requiredPkLookback } from '../../domain/simulation/windows'
import { cutoffAgeFor } from '../../domain/pk/cutoff'

const MS_PER_DAY = 86_400_000

function dose(id: string, amountMg: number, iso: string) {
  return { id, amountMg, time: iso }
}

describe('Comparador — janela e seleção', () => {
  const scenario = {
    id: 'sc1',
    name: 'Cenário A',
    color: '#0f766e',
    source: { type: 'manual' as const },
    displayUnit: 'mg' as const,
    selectedPkParameters: { halfLifeMs: 6 * MS_PER_DAY, tmaxMs: null },
    doses: [
      dose('antiga', 10, '2026-07-01T12:00:00Z'),
      dose('meio', 20, '2026-08-10T00:00:00Z'),
      dose('nova', 30, '2026-08-25T00:00:00Z'),
      dose('futura', 40, '2026-09-20T00:00:00Z'),
    ],
  }

  it('requiredPkLookback === max(cutoffAgeFor) e deriveCalculationWindow aplica o mesmo lookback', () => {
    const params = [
      scenario.selectedPkParameters,
      { halfLifeMs: 2 * MS_PER_DAY, tmaxMs: null },
    ]
    const lookback = requiredPkLookback(params)
    expect(lookback).toBe(Math.max(...params.map((p) => cutoffAgeFor(p))))

    const displayWindow = { startMs: instantIsoToEpochMs('2026-08-20T00:00:00Z'), endMs: instantIsoToEpochMs('2026-08-27T00:00:00Z') }
    const window = deriveCalculationWindow(displayWindow, params)
    expect(window.startMs).toBe(displayWindow.startMs - lookback)
    expect(window.endMs).toBe(displayWindow.endMs)
  })

  it('seleção usa [start,end); Scenario integral NÃO é mutado', () => {
    const snapshot = JSON.stringify(scenario.doses)
    const displayWindow = {
      startMs: instantIsoToEpochMs('2026-08-01T00:00:00Z'),
      endMs: instantIsoToEpochMs('2026-08-26T00:00:00Z'),
    }
    const params = [scenario.selectedPkParameters]
    const window = deriveCalculationWindow(displayWindow, params)
    const relevant = selectRelevantScenarioDoses(scenario.doses, window)

    // lookback = 44·T½ = 264 d ⇒ janela começa em 2025-11-10: 'antiga' (jul/2026) ENTRA;
    // 'futura' (set/2026) fica fora do end
    expect(relevant.map((d) => d.id)).toEqual(['antiga', 'meio', 'nova'])
    expect(JSON.stringify(scenario.doses)).toBe(snapshot)
  })

  it('assembleScenarioInputs produz SimulationInput sem tocar no Scenario nem chamar Recurrence', () => {
    const nowMs = instantIsoToEpochMs('2026-08-25T12:00:00Z')
    const relevant = selectRelevantScenarioDoses(scenario.doses, {
      startMs: instantIsoToEpochMs('2026-07-02T00:00:00Z'),
      endMs: instantIsoToEpochMs('2026-09-01T00:00:00Z'),
    })
    const input = assembleScenarioInputs(scenario, nowMs, relevant)

    expect(input.halfLifeMs).toBe(6 * MS_PER_DAY)
    expect(input.tmaxMs).toBeNull()
    expect(input.nowMs).toBe(nowMs)
    expect(input.doses.map((d) => d.id)).toEqual(['meio', 'nova'])
    expect(input.doses[1]).toEqual({ id: 'nova', amountMg: 30, timeMs: instantIsoToEpochMs('2026-08-25T00:00:00Z') })
  })
})

describe('Protocolos — um input por componente', () => {
  function protocolWith(components: Array<{ id: string; proportion: number }>, totalDoseMg = 100) {
    const kineticById: Record<string, { halfLifeMs: number; tmaxMs: number | null }> = {
      a: { halfLifeMs: 6 * MS_PER_DAY, tmaxMs: null },
      b: { halfLifeMs: 2 * MS_PER_DAY, tmaxMs: 60_000 },
      c: { halfLifeMs: 12 * MS_PER_DAY, tmaxMs: null },
    }
    return {
      id: 'proto',
      name: 'Blend',
      totalDoseMg,
      schedule: { startDate: '2026-01-05', localTime: '09:00', timeZone: 'UTC', recurrence: { type: 'single' as const } },
      components: components.map((c, i) => ({
        ...c,
        label: `c${i}`,
        source: { type: 'manual' as const },
        selectedPkParameters: kineticById[c.id] ?? { halfLifeMs: 6 * MS_PER_DAY, tmaxMs: null },
        pkParametersSnapshot: {
          halfLife: { value: 6, unit: 'days' as const },
          tmax: null,
        },
        displayColor: { paletteColor: 'blue' },
      })),
      createdAt: '2026-01-05T09:00:00Z',
      updatedAt: '2026-01-05T09:00:00Z',
    }
  }
  const occurrences = [
    { instantMs: 1_000, scheduleLocalDate: '2026-01-05' },
    { instantMs: 2_000, scheduleLocalDate: '2026-01-05' },
  ]

  it('3 componentes ⇒ exatamente 3 SimulationInputs com doses proporcionais distintas', () => {
    const result = assembleProtocolInputs(
      protocolWith([
        { id: 'a', proportion: 0.2 },
        { id: 'b', proportion: 0.3 },
        { id: 'c', proportion: 0.5 },
      ]),
      occurrences,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.length).toBe(3)

    const byId = new Map(result.value.map((entry) => [entry.componentId, entry.input]))
    expect(byId.get('a')!.doses.every((d) => d.amountMg === 100 * 0.2 && d.id.startsWith('proto:a:'))).toBe(true)
    expect(byId.get('b')!.doses.every((d) => d.amountMg === 100 * 0.3 && d.id.startsWith('proto:b:'))).toBe(true)
    expect(byId.get('c')!.doses.every((d) => d.amountMg === 100 * 0.5 && d.id.startsWith('proto:c:'))).toBe(true)

    // IDs determinísticos por composição protocolId:componentId:instantMs
    const again = assembleProtocolInputs(
      protocolWith([
        { id: 'a', proportion: 0.2 },
        { id: 'b', proportion: 0.3 },
        { id: 'c', proportion: 0.5 },
      ]),
      occurrences,
    )
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.value).toEqual(result.value)
  })

  it('reordenação de componentes não altera a associação por componentId (sem média PK)', () => {
    const orderA = protocolWith([
      { id: 'a', proportion: 0.2 },
      { id: 'b', proportion: 0.8 },
    ])
    const orderB = protocolWith([
      { id: 'b', proportion: 0.8 },
      { id: 'a', proportion: 0.2 },
    ])
    const resultA = assembleProtocolInputs(orderA, occurrences)
    const resultB = assembleProtocolInputs(orderB, occurrences)
    expect(resultA.ok && resultB.ok).toBe(true)
    if (!resultA.ok || !resultB.ok) return

    const mapA = new Map(resultA.value.map((e) => [e.componentId, e.input]))
    for (const entry of resultB.value) {
      expect(entry.input).toEqual(mapA.get(entry.componentId)!)
    }
    expect(resultB.value.map((e) => e.componentId)).toEqual(['b', 'a'])
  })

  it.each([
    ['proporção não positiva', [{ id: 'a', proportion: 0 }, { id: 'b', proportion: 1 }], ['COMPONENT_PROPORTION_INVALID']],
    ['soma ≠ 1', [{ id: 'a', proportion: 0.5 }, { id: 'b', proportion: 0.6 }], ['COMPONENT_PROPORTIONS_MUST_SUM_ONE']],
    [
      'total inválido',
      undefined,
      ['PROTOCOL_TOTAL_DOSE_INVALID'],
    ],
  ])('%s rejeitado com código normativo', (_name, components, expectedCodes) => {
    const proto =
      components === undefined
        ? { ...protocolWith([{ id: 'a', proportion: 1 }]), totalDoseMg: 0 }
        : protocolWith(components as Array<{ id: string; proportion: number }>)
    const result = assembleProtocolInputs(proto, occurrences)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.map((e) => e.code)).toEqual(expectedCodes)
  })

  it('>20 componentes ⇒ PROTOCOL_COMPONENT_LIMIT_EXCEEDED', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ id: `c${i}`, proportion: 1 / 21 }))
    const result = assembleProtocolInputs(protocolWith(many), occurrences)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.map((e) => e.code)).toContain('PROTOCOL_COMPONENT_LIMIT_EXCEEDED')
  })
})
