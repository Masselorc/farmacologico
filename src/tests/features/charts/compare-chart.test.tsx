import { render, cleanup } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComparatorAnalyzedScenario } from '../../../features/comparator/lib/analysis'

interface MockChartConfig {
  data: {
    datasets: Array<{
      label?: string
      data: Array<{ x: number; y: number | null }>
      spanGaps?: boolean
    }>
  }
}

const mockDestroy = vi.fn()
let lastChartConfig: MockChartConfig | null = null
let lastChartCanvas: HTMLCanvasElement | null = null
let chartConstructorCalls = 0

vi.mock('chart.js', () => {
  return {
    Chart: class MockChart {
      static register = vi.fn()
      constructor(canvas: HTMLCanvasElement, config: MockChartConfig) {
        chartConstructorCalls++
        lastChartCanvas = canvas
        lastChartConfig = config
      }
      destroy = mockDestroy
    },
    CategoryScale: {},
    LineController: {},
    LineElement: {},
    LinearScale: {},
    LogarithmicScale: {},
    PointElement: {},
    Tooltip: {},
  }
})

import { CompareChart } from '../../../features/charts/CompareChart'

describe('CompareChart Component (§15, E9, E9.1)', () => {
  beforeEach(() => {
    mockDestroy.mockClear()
    lastChartConfig = null
    lastChartCanvas = null
    chartConstructorCalls = 0
    cleanup()
  })

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

  it('renderiza elemento canvas com atributos de acessibilidade e instancia Chart.js', () => {
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

    expect(chartConstructorCalls).toBe(1)
    expect(lastChartCanvas).toBe(canvas)
    expect(lastChartConfig).toBeTruthy()
  })

  it('no modo linear, preserva os pontos numéricos nos datasets', () => {
    render(
      <CompareChart
        analyzedScenarios={[mockScenario]}
        calendarTimeZone="America/Sao_Paulo"
        scaleMode="absolute"
        yAxisMode="linear"
      />,
    )

    expect(lastChartConfig).not.toBeNull()
    expect(lastChartConfig!.data.datasets).toHaveLength(1)
    const dataset = lastChartConfig!.data.datasets[0]
    expect(dataset.label).toBe('Série A')
    expect(dataset.data).toEqual([
      { x: 1000, y: 10 },
      { x: 2000, y: 0 },
    ])
  })

  it('no modo log, pontos com clippedBelowLogEpsilon viram y: null na geometria do canvas', () => {
    render(
      <CompareChart
        analyzedScenarios={[mockScenario]}
        calendarTimeZone="America/Sao_Paulo"
        scaleMode="absolute"
        yAxisMode="log"
      />,
    )

    expect(lastChartConfig).not.toBeNull()
    expect(lastChartConfig!.data.datasets).toHaveLength(1)
    const dataset = lastChartConfig!.data.datasets[0]
    expect(dataset.data).toEqual([
      { x: 1000, y: 10 },
      { x: 2000, y: null }, // Clipped point omitido da geometria
    ])
    expect(dataset.spanGaps).toBe(false)
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

  it('chama destroy() da instância do Chart ao desmontar o componente', () => {
    const { unmount } = render(
      <CompareChart
        analyzedScenarios={[mockScenario]}
        calendarTimeZone="America/Sao_Paulo"
        scaleMode="absolute"
        yAxisMode="linear"
      />,
    )

    expect(mockDestroy).not.toHaveBeenCalled()
    unmount()
    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })
})
