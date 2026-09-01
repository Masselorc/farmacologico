import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CompareChart } from '../../../features/charts/CompareChart'
import type { ComparatorAnalyzedScenario } from '../../../features/comparator/lib/analysis'

describe('CompareChart Component (§15, E9)', () => {
  const mockScenario: ComparatorAnalyzedScenario = {
    scenario: {
      id: 'sc-1',
      name: 'Série A',
      color: '#2563eb',
      source: { type: 'manual' },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
      doses: [],
    },
    calculationWindow: { startMs: 1000, endMs: 5000 },
    simulationInput: {
      halfLifeMs: 86400000,
      tmaxMs: null,
      doses: [{ id: 'd-1', amountMg: 10, timeMs: 1000 }],
      nowMs: 1000,
    },
    result: {
      currentState: {
        administeredMg: 10,
        centralMg: 10,
        depotMg: 0,
        eliminatedMg: 0,
        administeredCount: 1,
        plannedCount: 0,
        centralPercent: 100,
        depotPercent: 0,
        eliminatedPercent: 0,
      },
      analysisCurve: [{ timeMs: 1000, amountMg: 10 }],
      peak: { timeMs: 1000, amountMg: 10 },
      milestones: [],
      administrations: [],
      warnings: [],
      metadata: {
        pkEngineVersion: '1.0.0',
        kePerMs: 0.001,
        kaPerMs: null,
        terminalHalfLifeMs: 86400000,
        horizonEndMs: 5000,
        analysisCurveSteps: 100,
        contributionCutoffHalfLives: 44,
        contributionCutoffAgeMs: 3801600000,
      },
    },
    displayPoints: [{ timeMs: 1000, amountMg: 10 }],
    snapshotPoints: [
      { timeMs: 1000, value: 10, valueKind: 'mg', clippedBelowLogEpsilon: false },
      { timeMs: 2000, value: 0, valueKind: 'mg', clippedBelowLogEpsilon: true },
    ],
    phaseHint: 'terminal_decline',
  }

  it('renderiza elemento canvas com atributos de acessibilidade', () => {
    const { container } = render(
      <CompareChart
        analyzedScenarios={[mockScenario]}
        calendarTimeZone="America/Sao_Paulo"
        scaleMode="absolute"
        yAxisMode="linear"
      />,
    )

    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
    expect(canvas?.getAttribute('role')).toBe('img')
    expect(canvas?.getAttribute('aria-label')).toBeTruthy()
  })

  it('exibe aviso de clipping quando em modo log com pontos abaixo de epsilon', () => {
    const { getByText } = render(
      <CompareChart
        analyzedScenarios={[mockScenario]}
        calendarTimeZone="America/Sao_Paulo"
        scaleMode="absolute"
        yAxisMode="log"
      />,
    )

    expect(
      getByText(/Alguns valores muito próximos de zero foram omitidos da geometria do gráfico logarítmico/i),
    ).toBeTruthy()
  })
})
