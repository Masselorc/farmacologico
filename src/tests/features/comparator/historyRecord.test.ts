import { describe, expect, it } from 'vitest'
import { CURRENT_DATASET_VERSION } from '../../../domain/version'
import type { DisplayWindow, Scenario } from '../../../domain/types'
import { createComparatorCalculationRecord } from '../../../features/comparator/lib/historyRecord'
import type { ComparatorAnalyzedScenario } from '../../../features/comparator/lib/analysis'

describe('createComparatorCalculationRecord (§11, §15, E9)', () => {
  const displayWindow: DisplayWindow = { startMs: 1000, endMs: 5000 }
  const calendarTimeZone = 'America/Sao_Paulo'

  const mockScenario1: Scenario = {
    id: 'sc-1',
    name: 'Cenário Alfa',
    color: '#2563eb',
    source: { type: 'manual' },
    displayUnit: 'mg',
    selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
    doses: [
      { id: 'd-1', amountMg: 100, time: '2026-09-01T12:00:00Z' },
      { id: 'd-2', amountMg: 100, time: '2026-08-01T12:00:00Z' }, // antiga fora do input
    ],
  }

  const analyzedItem1: ComparatorAnalyzedScenario = {
    scenario: mockScenario1,
    calculationWindow: { startMs: 500, endMs: 5000 },
    simulationInput: {
      halfLifeMs: 86400000,
      tmaxMs: null,
      doses: [{ id: 'd-1', amountMg: 100, timeMs: 1788264000000 }],
      nowMs: 1788264000000,
    },
    result: {
      currentState: {
        administeredMg: 100,
        centralMg: 50,
        depotMg: 0,
        eliminatedMg: 50,
        administeredCount: 1,
        plannedCount: 0,
        centralPercent: 50,
        depotPercent: 0,
        eliminatedPercent: 50,
      },
      analysisCurve: [{ timeMs: 1000, amountMg: 50 }],
      peak: { timeMs: 1000, amountMg: 100 },
      milestones: [{ percentage: 50, targetMg: 50, timeMs: 2000 }],
      administrations: [{ doseId: 'd-1', timeMs: 1788264000000, amountMg: 100 }],
      warnings: [],
      metadata: {
        pkEngineVersion: '1.2.3',
        kePerMs: 0.0001,
        kaPerMs: null,
        terminalHalfLifeMs: 86400000,
        horizonEndMs: 5000,
        analysisCurveSteps: 100,
        contributionCutoffHalfLives: 44,
        contributionCutoffAgeMs: 3801600000,
      },
    },
    displayPoints: [{ timeMs: 1000, amountMg: 50 }],
    snapshotPoints: [{ timeMs: 1000, value: 50, valueKind: 'mg' }],
    phaseHint: 'terminal_decline',
  }

  it('monta registro para 1 cenário com título e metadados corretos', () => {
    const record = createComparatorCalculationRecord({
      analyzedScenarios: [analyzedItem1],
      displayWindow,
      calendarTimeZone,
      scaleMode: 'absolute',
      yAxisMode: 'linear',
    })

    expect(record.type).toBe('pharmacokinetics')
    if (record.type !== 'pharmacokinetics') return

    expect(record.display.title).toContain('Cenário Alfa')
    expect(record.display.color).toBe('#2563eb')
    expect(record.versions.pkEngineVersion).toBe('1.2.3')
    expect(record.versions.datasetVersion).toBe(CURRENT_DATASET_VERSION)

    expect(record.scenarios).toHaveLength(1)
    expect(record.scenarios[0].scenarioId).toBe('sc-1')
    expect(record.scenarios[0].scenarioSnapshot.doses).toHaveLength(2) // todas as doses preservadas!
    expect(record.scenarios[0].simulationInput.doses).toHaveLength(1) // input filtrado

    expect(record.chartViewSnapshot.calendarTimeZone).toBe('America/Sao_Paulo')
    expect(record.chartViewSnapshot.scaleMode).toBe('absolute')
    expect(record.chartViewSnapshot.displayPointsByScenario).toHaveLength(1)
    expect(record.chartViewSnapshot.displayPointsByScenario[0].scenarioId).toBe('sc-1')
  })

  it('monta registro multicenário mantendo cardinalidade 1:1 e identificadores íntegros', () => {
    const mockScenario2: Scenario = {
      id: 'sc-2',
      name: 'Cenário Beta',
      color: '#059669',
      source: { type: 'manual' },
      displayUnit: 'mcg',
      selectedPkParameters: { halfLifeMs: 43200000, tmaxMs: null },
      doses: [{ id: 'd-3', amountMg: 50, time: '2026-09-01T12:00:00Z' }],
    }

    const analyzedItem2: ComparatorAnalyzedScenario = {
      ...analyzedItem1,
      scenario: mockScenario2,
      snapshotPoints: [{ timeMs: 1000, value: 50, valueKind: 'mg' }],
    }

    const record = createComparatorCalculationRecord({
      analyzedScenarios: [analyzedItem1, analyzedItem2],
      displayWindow,
      calendarTimeZone,
      scaleMode: 'normalized',
      yAxisMode: 'log',
    })

    if (record.type !== 'pharmacokinetics') return

    expect(record.display.title).toContain('2 cenários')
    expect(record.scenarios).toHaveLength(2)
    expect(record.chartViewSnapshot.displayPointsByScenario).toHaveLength(2)
    expect(record.scenarios[0].scenarioId).toBe('sc-1')
    expect(record.scenarios[1].scenarioId).toBe('sc-2')
    expect(record.chartViewSnapshot.displayPointsByScenario[0].scenarioId).toBe('sc-1')
    expect(record.chartViewSnapshot.displayPointsByScenario[1].scenarioId).toBe('sc-2')
  })

  it('realiza cópia defensiva sem vazar referências mutáveis', () => {
    const record = createComparatorCalculationRecord({
      analyzedScenarios: [analyzedItem1],
      displayWindow,
      calendarTimeZone,
      scaleMode: 'absolute',
      yAxisMode: 'linear',
    })

    if (record.type !== 'pharmacokinetics') return

    // Mutar original
    mockScenario1.name = 'Nome Alterado Depois'
    analyzedItem1.snapshotPoints[0].value = 9999

    expect(record.scenarios[0].scenarioSnapshot.name).toBe('Cenário Alfa')
    expect(record.chartViewSnapshot.displayPointsByScenario[0].points[0].value).toBe(50)
  })
})
