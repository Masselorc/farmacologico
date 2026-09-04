import { useEffect, useRef } from 'react'
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartDataset,
  type Plugin,
} from 'chart.js'
import { Temporal } from '@js-temporal/polyfill'
import { messages } from '../../app/i18n/pt-BR.messages'
import {
  formatPresentationDateLong,
  formatPresentationDateShort,
  formatPresentationNumber,
} from '../comparator/lib/presentation'
import type { ProtocolLiveSeries, TemporalGuide } from '../protocols/lib/analysis'
import type { TimeZoneId } from '../../domain/types'
import { sanitizePaletteColor } from '../../domain/shared/colors'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
)

export interface KineticChartProps {
  series: ReadonlyArray<ProtocolLiveSeries>
  temporalGuides: ReadonlyArray<TemporalGuide>
  calendarTimeZone: TimeZoneId
  chartTitle?: string
  emptyMessage?: string
}

export function KineticChart({
  series,
  temporalGuides,
  calendarTimeZone,
  chartTitle,
  emptyMessage,
}: KineticChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    if (series.length === 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
      return undefined
    }

    const datasets: ChartDataset<'line', Array<{ x: number; y: number }>>[] = []

    for (const item of series) {
      const pointsData = item.displayPoints.map((pt) => ({
        x: pt.timeMs,
        y: pt.amountMg,
      }))

      const safeColor = sanitizePaletteColor(item.color.paletteColor)

      datasets.push({
        label: `${item.protocolName} — ${item.componentLabel}`,
        data: pointsData,
        borderColor: safeColor,
        backgroundColor: safeColor,
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

    // Plugin para desenhar as guias temporais de administração no canvas
    const temporalGuidesPlugin: Plugin = {
      id: 'kineticTemporalGuides',
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart
        if (!chartArea || !scales.x) return
        const xScale = scales.x

        ctx.save()
        for (const guide of temporalGuides) {
          const xPos = xScale.getPixelForValue(guide.instantMs)
          if (xPos >= chartArea.left && xPos <= chartArea.right) {
            ctx.beginPath()
            ctx.setLineDash([4, 4])
            ctx.strokeStyle = sanitizePaletteColor(guide.color.paletteColor)
            ctx.lineWidth = 1
            ctx.moveTo(xPos, chartArea.top)
            ctx.lineTo(xPos, chartArea.bottom)
            ctx.stroke()
          }
        }
        ctx.restore()
      },
    }

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
            type: 'linear',
            grid: {
              color: 'rgba(148, 163, 184, 0.15)',
            },
            ticks: {
              callback: (tickValue) => {
                const num = typeof tickValue === 'number' ? tickValue : Number(tickValue)
                if (!Number.isFinite(num)) return ''
                return `${formatPresentationNumber(num, 3)} mg`
              },
            },
          },
        },
      },
      plugins: [temporalGuidesPlugin],
    })

    chartInstanceRef.current = chart

    return () => {
      chart.destroy()
      chartInstanceRef.current = null
    }
  }, [series, temporalGuides, calendarTimeZone])

  if (series.length === 0) {
    return (
      <div className="kinetic-chart-empty" role="status">
        <p>{emptyMessage || messages.protocols.noSeriesSelected}</p>
      </div>
    )
  }

  return (
    <div className="kinetic-chart-container">
      {chartTitle && <h3 className="kinetic-chart-title">{chartTitle}</h3>}
      <div className="kinetic-chart-frame">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={messages.protocols.kineticChartAriaLabel}
        />
      </div>

      {/* Tabela de acessibilidade para leitores de tela */}
      <table className="sr-only" aria-label={messages.protocols.chartTableFallback}>
        <thead>
          <tr>
            <th>{messages.protocols.seriesColumnHeader}</th>
            <th>{messages.protocols.peakColumnHeader}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.seriesId}>
              <td>{`${s.protocolName} — ${s.componentLabel}`}</td>
              <td>{`${formatPresentationNumber(s.result.peak.amountMg, 3)} mg`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
