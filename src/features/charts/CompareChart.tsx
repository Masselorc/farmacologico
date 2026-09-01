import { useEffect, useRef } from 'react'
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
  type ChartDataset,
} from 'chart.js'
import { Temporal } from '@js-temporal/polyfill'
import { messages } from '../../app/i18n/pt-BR.messages'
import { formatPresentationDateLong, formatPresentationDateShort, formatPresentationNumber, formatPresentationPercent } from '../comparator/lib/presentation'
import type { ComparatorAnalyzedScenario } from '../comparator/lib/analysis'
import type { ChartScaleMode, ChartYAxisMode, TimeZoneId } from '../../domain/types'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  LogarithmicScale,
  CategoryScale,
  Tooltip,
)

export interface CompareChartProps {
  analyzedScenarios: ReadonlyArray<ComparatorAnalyzedScenario>
  calendarTimeZone: TimeZoneId
  scaleMode: ChartScaleMode
  yAxisMode: ChartYAxisMode
}

export function CompareChart({
  analyzedScenarios,
  calendarTimeZone,
  scaleMode,
  yAxisMode,
}: CompareChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const datasets: ChartDataset<'line', Array<{ x: number; y: number | null }>>[] = []

    for (const item of analyzedScenarios) {
      const isPeakNonPositive = item.result.peak.amountMg <= 0

      // No modo log, se o pico for <= 0 não há domínio log válido
      if (yAxisMode === 'log' && isPeakNonPositive) {
        continue
      }

      const pointsData = item.snapshotPoints.map((pt) => {
        // Se estiver marcado como clipped no modo log, omitir do canvas (y = null)
        const yValue = yAxisMode === 'log' && pt.clippedBelowLogEpsilon ? null : pt.value
        return {
          x: pt.timeMs,
          y: yValue,
        }
      })

      datasets.push({
        label: item.scenario.name,
        data: pointsData,
        borderColor: item.scenario.color,
        backgroundColor: item.scenario.color,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        spanGaps: false,
      })
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
      chartInstanceRef.current = null
    }

    const isLog = yAxisMode === 'log'

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            callbacks: {
              title: (tooltipItems) => {
                if (tooltipItems.length === 0) return ''
                const xVal = tooltipItems[0].parsed.x
                if (xVal === null || !Number.isFinite(xVal)) return ''
                try {
                  const instantIso = Temporal.Instant.fromEpochMilliseconds(xVal).toString()
                  return formatPresentationDateLong(instantIso, calendarTimeZone)
                } catch {
                  return ''
                }
              },
              label: (tooltipItem) => {
                const datasetLabel = tooltipItem.dataset.label || ''
                const yVal = tooltipItem.parsed.y
                if (yVal === null || !Number.isFinite(yVal)) {
                  return `${datasetLabel}: —`
                }
                if (scaleMode === 'normalized') {
                  return `${datasetLabel}: ${formatPresentationPercent(yVal)}`
                }
                return `${datasetLabel}: ${formatPresentationNumber(yVal, 3)} mg`
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            grid: {
              color: 'rgba(148, 163, 184, 0.15)',
            },
            ticks: {
              maxTicksLimit: 8,
              callback: (tickValue) => {
                const num = typeof tickValue === 'number' ? tickValue : Number(tickValue)
                if (!Number.isFinite(num)) return ''
                try {
                  const instantIso = Temporal.Instant.fromEpochMilliseconds(num).toString()
                  return formatPresentationDateShort(instantIso, calendarTimeZone)
                } catch {
                  return ''
                }
              },
            },
          },
          y: {
            type: isLog ? 'logarithmic' : 'linear',
            grid: {
              color: 'rgba(148, 163, 184, 0.15)',
            },
            ticks: {
              callback: (tickValue) => {
                const num = typeof tickValue === 'number' ? tickValue : Number(tickValue)
                if (!Number.isFinite(num)) return ''
                if (scaleMode === 'normalized') {
                  return formatPresentationPercent(num)
                }
                return `${formatPresentationNumber(num, 3)} mg`
              },
            },
          },
        },
      },
    })

    chartInstanceRef.current = chart

    return () => {
      chart.destroy()
      chartInstanceRef.current = null
    }
  }, [analyzedScenarios, calendarTimeZone, scaleMode, yAxisMode])

  const hasClippedPoints = analyzedScenarios.some((item) =>
    item.snapshotPoints.some((pt) => pt.clippedBelowLogEpsilon),
  )

  const nonPositivePeakScenarios =
    yAxisMode === 'log'
      ? analyzedScenarios.filter((item) => item.result.peak.amountMg <= 0)
      : []

  return (
    <div className="compare-chart-container">
      <div className="compare-chart-frame">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={messages.comparator.chartAriaLabel}
        />
      </div>

      {hasClippedPoints && yAxisMode === 'log' && (
        <div className="comparator-notice log-clipped-notice" role="status">
          {messages.comparator.logClippedNotice}
        </div>
      )}

      {nonPositivePeakScenarios.map((item) => (
        <div
          key={item.scenario.id}
          className="comparator-notice log-zero-peak-notice"
          role="status"
        >
          {messages.comparator.logZeroPeakNotice(item.scenario.name)}
        </div>
      ))}
    </div>
  )
}
