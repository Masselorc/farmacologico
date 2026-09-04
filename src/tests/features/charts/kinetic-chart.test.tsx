import { render, cleanup } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProtocolLiveSeries, TemporalGuide } from '../../../features/protocols/lib/analysis'

interface MockChartConfig {
  data: {
    datasets: Array<{
      label?: string
      data: Array<{ x: number; y: number | null }>
      borderColor?: string
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
    PointElement: {},
    Tooltip: {},
  }
})

import { analyze } from '../../../domain/pk/analysis'
import { KineticChart } from '../../../features/charts/KineticChart'

describe('KineticChart Component (E11)', () => {
  beforeEach(() => {
    mockDestroy.mockClear()
    lastChartConfig = null
    lastChartCanvas = null
    chartConstructorCalls = 0
    cleanup()
  })

  it('exibe estado vazio quando não há séries', () => {
    const { getByRole } = render(
      <KineticChart
        series={[]}
        temporalGuides={[]}
        calendarTimeZone="America/Sao_Paulo"
      />,
    )

    const statusEl = getByRole('status')
    expect(statusEl).toBeDefined()
    expect(chartConstructorCalls).toBe(0)
  })

  it('renderiza canvas, instancia Chart e inclui tabela de acessibilidade quando há séries', () => {
    const liveInput = {
      halfLifeMs: 6 * 86400000,
      tmaxMs: 2 * 86400000,
      doses: [{ id: 'd1', timeMs: 1788134400000, amountMg: 250 }],
      nowMs: 1788220800000,
    }
    const result = analyze(liveInput)

    const mockSeries: ProtocolLiveSeries = {
      key: { protocolId: 'p1', componentId: 'c1' },
      seriesId: 'p1:c1',
      protocolId: 'p1',
      protocolName: 'Enantato Semanal',
      componentId: 'c1',
      componentLabel: 'Enantato',
      color: { paletteColor: '#2563eb' },
      input: liveInput,
      result,
      displayPoints: [
        { timeMs: 1788134400000, amountMg: 0 },
        { timeMs: 1788220800000, amountMg: 200 },
      ],
    }

    const mockGuides: TemporalGuide[] = [
      {
        protocolId: 'p1',
        protocolName: 'Enantato Semanal',
        instantMs: 1788134400000,
        color: { paletteColor: '#2563eb' },
      },
    ]

    const { getByRole } = render(
      <KineticChart
        series={[mockSeries]}
        temporalGuides={mockGuides}
        calendarTimeZone="America/Sao_Paulo"
        chartTitle="Curvas Farmacocinéticas"
      />,
    )

    // Canvas com role="img"
    const canvas = getByRole('img')
    expect(canvas).toBeDefined()
    expect(chartConstructorCalls).toBe(1)
    expect(lastChartCanvas).toBe(canvas)

    // Dados do dataset Chart.js
    expect(lastChartConfig?.data.datasets).toHaveLength(1)
    expect(lastChartConfig?.data.datasets[0]?.label).toBe('Enantato Semanal — Enantato')
    expect(lastChartConfig?.data.datasets[0]?.data).toHaveLength(2)

    // Tabela de acessibilidade sr-only
    const table = getByRole('table', { hidden: true })
    expect(table).toBeDefined()
  })

  it('destrói instância anterior do Chart ao desmontar', () => {
    const mockSeries: ProtocolLiveSeries = {
      key: { protocolId: 'p1', componentId: 'c1' },
      seriesId: 'p1:c1',
      protocolId: 'p1',
      protocolName: 'Enantato',
      componentId: 'c1',
      componentLabel: 'Enantato',
      color: { paletteColor: '#2563eb' },
      input: {
        halfLifeMs: 6 * 86400000,
        tmaxMs: null,
        doses: [{ id: 'd1', timeMs: 1788134400000, amountMg: 100 }],
        nowMs: 1788220800000,
      },
      result: analyze({
        halfLifeMs: 6 * 86400000,
        tmaxMs: null,
        doses: [{ id: 'd1', timeMs: 1788134400000, amountMg: 100 }],
        nowMs: 1788220800000,
      }),
      displayPoints: [{ timeMs: 1788134400000, amountMg: 100 }],
    }

    const { unmount } = render(
      <KineticChart
        series={[mockSeries]}
        temporalGuides={[]}
        calendarTimeZone="America/Sao_Paulo"
      />,
    )

    expect(chartConstructorCalls).toBe(1)
    unmount()
    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })
})
