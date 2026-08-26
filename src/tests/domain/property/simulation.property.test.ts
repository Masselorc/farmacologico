import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { assembleProtocolInputs, assembleScenarioInputs, selectRelevantScenarioDoses } from '../../../domain/simulation/assemble'
import { requiredPkLookback } from '../../../domain/simulation/windows'
import { cutoffAgeFor } from '../../../domain/pk/cutoff'
import { proportionSumClose } from '../../../domain/shared/tolerances'
import { SAFETY_LIMITS } from '../../../validation/limits'
import { MS_PER_DAY } from './cutoff-fixtures'
import { forAllSeeds } from './helpers'

const MS_PER_HOUR = 3_600_000

describe('E4 simulation — janela e seleção do Comparador', () => {
  it('seleciona exatamente [start,end): fronteiras incluída/excluída; original imutável', () => {
    const startMs = 1_750_000_000_000
    const endMs = startMs + 30 * MS_PER_DAY

    const doses = [
      { id: 'antes', amountMg: 1, time: new Date(startMs - 1).toISOString() },
      { id: 'no-start', amountMg: 2, time: new Date(startMs).toISOString() },
      { id: 'meio', amountMg: 4, time: new Date(startMs + 86_400_000).toISOString() },
      { id: 'no-end', amountMg: 8, time: new Date(endMs).toISOString() },
      { id: 'depois', amountMg: 16, time: new Date(endMs + 86_400_000).toISOString() },
    ]
    const snapshot = JSON.stringify(doses)

    const selected = selectRelevantScenarioDoses(doses, { startMs, endMs })
    expect(selected.map((d) => d.id)).toEqual(['no-start', 'meio'])
    expect(JSON.stringify(doses)).toBe(snapshot)

    // assembleScenarioInputs usa somente as relevantes e preserva parâmetros.
    const scenario = {
      id: 's',
      name: 'S',
      color: '#fff',
      source: { type: 'manual' as const },
      displayUnit: 'mg' as const,
      selectedPkParameters: { halfLifeMs: 6 * MS_PER_DAY, tmaxMs: null },
      doses,
    }
    const input = assembleScenarioInputs(scenario, endMs, selected)
    expect(input.doses.map((d) => d.id)).toEqual(['no-start', 'meio'])
    expect(input.halfLifeMs).toBe(6 * MS_PER_DAY)
    expect(input.tmaxMs).toBeNull()
    expect(JSON.stringify(scenario.doses)).toBe(snapshot)
  })
})

describe('E4 lookback — invariante max(cutoffAgeFor)', () => {
  it('para 1, 3 e 20 componentes (blend usa o MAIOR)', () => {
    const property = fc.property(
      fc.array(
        fc.record({
          halfLifeMs: fc.integer({ min: MS_PER_HOUR, max: 90 * MS_PER_DAY }),
          tmaxMs: fc.option(fc.integer({ min: 900_000, max: MS_PER_DAY }), { nil: null as null }),
        }),
        { minLength: 1, maxLength: 20 },
      ),
      (params) => {
        expect(requiredPkLookback(params)).toBe(Math.max(...params.map((p) => cutoffAgeFor(p))))
      },
    )
    forAllSeeds(property, { numRuns: 100 })
  })

  it('ordem não altera o lookback', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => ({
      halfLifeMs: (i + 1) * MS_PER_HOUR,
      tmaxMs: null,
    }))
    expect(requiredPkLookback(twenty)).toBe(Math.max(...twenty.map((p) => cutoffAgeFor(p))))
  })
})

describe('E4 protocolos — proporções, cap e identidade', () => {
  function makeProtocol(componentProportions: number[], totalDoseMg = 100) {
    return {
      id: 'p1',
      name: 'Blend',
      totalDoseMg,
      schedule: {
        startDate: '2026-01-05',
        localTime: '09:00',
        timeZone: 'UTC',
        recurrence: { type: 'single' as const },
      },
      components: componentProportions.map((proportion, i) => ({
        id: `c${i}`,
        label: `L${i}`,
        proportion,
        source: { type: 'manual' as const },
        selectedPkParameters: {
          halfLifeMs: (i + 1) * MS_PER_DAY,
          tmaxMs: i % 2 === 0 ? null : 60_000,
        },
        pkParametersSnapshot: {
          halfLife: { value: i + 1, unit: 'days' as const },
          tmax: i % 2 === 0 ? null : { value: 1, unit: 'minutes' as const },
        },
        displayColor: { paletteColor: 'blue' },
      })),
      createdAt: '2026-01-05T09:00:00Z',
      updatedAt: '2026-01-05T09:00:00Z',
    }
  }
  const occurrences = [
    { instantMs: 5_000_000, scheduleLocalDate: '2026-01-05' },
    { instantMs: 9_000_000, scheduleLocalDate: '2026-01-05' },
  ]

  it('proporções válidas: N componentes ⇒ N inputs; soma das doses ≈ totalDose', () => {
    const property = fc.property(
      fc.integer({ min: 1, max: 20 }),
      fc.integer({ min: 1, max: 500 }),
      (count, seedBase) => {
        const raw = Array.from({ length: count }, (_, i) => 1 + ((seedBase + i) % 97))
        const sum = raw.reduce((a, b) => a + b, 0)
        const proportions = raw.map((w) => w / sum)
        if (!proportionSumClose(proportions)) return

        const result = assembleProtocolInputs(makeProtocol(proportions), occurrences)
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.value.length).toBe(count)

        const derivedSum = result.value.reduce((acc, entry) => acc + entry.input.doses[0]!.amountMg, 0)
        expect(Math.abs(derivedSum - 100)).toBeLessThanOrEqual(1e-9)
        for (const entry of result.value) {
          for (const dose of entry.input.doses) {
            expect(Number.isFinite(dose.amountMg)).toBe(true)
            expect(dose.amountMg).toBeGreaterThan(0)
            expect(dose.amountMg).toBeLessThanOrEqual(SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX)
            expect(dose.id).toBe(`p1:${entry.componentId}:${dose.timeMs}`)
          }
          // Sem média de PK: cada componente carrega os PRÓPRIOS parâmetros.
          const componentIndex = Number(entry.componentId.slice(1))
          expect(entry.input.halfLifeMs).toBe((componentIndex + 1) * MS_PER_DAY)
        }
      },
    )
    forAllSeeds(property, { numRuns: 150 })
  })

  it('inválidos explícitos rejeitados mesmo com "soma aparente" 1', () => {
    const invalidSets: number[][] = [
      [-0.2, 1.2],
      [0, 1],
      [Number.NaN, 1],
      [Number.POSITIVE_INFINITY, -Number.POSITIVE_INFINITY],
      [0.5, 0.5 + 2e-12], // fora de PROPORTION_SUM_ATOL=1e-12
    ]
    for (const proportions of invalidSets) {
      const result = assembleProtocolInputs(makeProtocol(proportions), occurrences)
      expect(result.ok).toBe(false)
      if (result.ok) continue
      const codes = result.error.map((e) => e.code)
      expect(codes.some((c) => c === 'COMPONENT_PROPORTION_INVALID' || c === 'COMPONENT_PROPORTIONS_MUST_SUM_ONE')).toBe(true)
    }

    // Dentro da tolerância é aceito:
    const withinTolerance = assembleProtocolInputs(makeProtocol([0.5, 0.5 + 1e-13]), occurrences)
    expect(withinTolerance.ok).toBe(true)
  })

  it('cap: 20 aceitos, 21 rejeitados com PROTOCOL_COMPONENT_LIMIT_EXCEEDED', () => {
    const equalWeights = (n: number): number[] => Array.from({ length: n }, () => 1 / n)
    expect(assembleProtocolInputs(makeProtocol(equalWeights(20)), occurrences).ok).toBe(true)

    const rejected = assembleProtocolInputs(makeProtocol(equalWeights(21)), occurrences)
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) {
      expect(rejected.error.map((e) => e.code)).toContain('PROTOCOL_COMPONENT_LIMIT_EXCEEDED')
    }
  })

  it('reordenação não troca associação; IDs determinísticos por (protocolId,componentId,instantMs)', () => {
    const orderA = makeProtocol([0.25, 0.75])
    const orderB = { ...orderA, components: [...orderA.components].reverse() }

    const resultA = assembleProtocolInputs(orderA, occurrences)
    const resultB = assembleProtocolInputs(orderB, occurrences)
    expect(resultA.ok && resultB.ok).toBe(true)
    if (!resultA.ok || !resultB.ok) return

    const mapA = new Map(resultA.value.map((entry) => [entry.componentId, entry.input]))
    for (const entry of resultB.value) {
      expect(entry.input).toEqual(mapA.get(entry.componentId))
    }
    expect(mapA.get('c0')!.halfLifeMs).not.toBe(mapA.get('c1')!.halfLifeMs)
  })
})
