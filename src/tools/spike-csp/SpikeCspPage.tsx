import { useEffect, useRef } from 'react'
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { messages } from '../../app/i18n/pt-BR.messages'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
)

const POINT_COUNT = 48

function accentColor(): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent')
    .trim()
  return value.length > 0 ? value : '#0f766e'
}

function mutedColor(): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-text-muted')
    .trim()
  return value.length > 0 ? value : '#94a3b8'
}

// Dados totalmente fictícios/técnicos: nenhum conteúdo farmacocinético.
function spikeSeries(fn: (x: number) => number): number[] {
  return Array.from({ length: POINT_COUNT }, (_, i) => fn(i / (POINT_COUNT - 1)))
}

export function SpikeCspPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) {
      return undefined
    }

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: Array.from({ length: POINT_COUNT }, (_, i) => `${i}`),
        datasets: [
          {
            label: 'série A (fictícia)',
            data: spikeSeries((x) => Math.exp(-2.2 * x) * Math.sin(9 * x)),
            borderColor: accentColor(),
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
          },
          {
            label: 'série B (fictícia)',
            data: spikeSeries((x) => Math.exp(-1.4 * x) * Math.cos(6 * x)),
            borderColor: mutedColor(),
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 8 },
            title: { display: true, text: 'amostra' },
          },
          y: {
            title: { display: true, text: 'valor fictício' },
          },
        },
      },
    })

    return () => {
      chart.destroy()
    }
  }, [])

  return (
    <section className="page">
      <h1 className="page-title">Spike — CSP × Chart.js</h1>
      <p className="page-placeholder">{messages.pages.spike}</p>
      <div className="chart-frame">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Gráfico técnico fictício para validação do gate CSP da E1"
        ></canvas>
      </div>
    </section>
  )
}
