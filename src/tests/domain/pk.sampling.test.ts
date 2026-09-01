import { describe, expect, it } from 'vitest'
import { sampleForDisplay } from '../../domain/pk/sampling'
import type { DisplayWindow } from '../../domain/types'

describe('sampleForDisplay (§15, E9)', () => {
  const displayWindow: DisplayWindow = { startMs: 1000, endMs: 5000 }

  it('retorna todos os pontos quando a curva filtrada possui <= 1200 pontos', () => {
    const curve = [
      { timeMs: 500, amountMg: 10 }, // fora (antes)
      { timeMs: 1000, amountMg: 20 },
      { timeMs: 2000, amountMg: 50 },
      { timeMs: 5000, amountMg: 10 },
      { timeMs: 6000, amountMg: 5 }, // fora (depois)
    ]

    const sampled = sampleForDisplay(curve, { displayWindow, maxPoints: 1200 })
    expect(sampled).toHaveLength(3)
    expect(sampled[0]).toEqual({ timeMs: 1000, amountMg: 20, clippedBelowLogEpsilon: false })
    expect(sampled[1]).toEqual({ timeMs: 2000, amountMg: 50, clippedBelowLogEpsilon: false })
    expect(sampled[2]).toEqual({ timeMs: 5000, amountMg: 10, clippedBelowLogEpsilon: false })
  })

  it('faz thinning determinístico mantendo primeiro, último e o pico quando pontos > maxPoints', () => {
    const totalPoints = 3000
    const curve: Array<{ timeMs: number; amountMg: number }> = []

    for (let i = 0; i < totalPoints; i++) {
      const timeMs = 1000 + i * (4000 / (totalPoints - 1))
      // Pico intencional no ponto index 1234
      const amountMg = i === 1234 ? 999 : Math.sin(i / 100) * 10 + 20
      curve.push({ timeMs, amountMg })
    }

    const maxPoints = 1200
    const sampled = sampleForDisplay(curve, { displayWindow, maxPoints })

    expect(sampled.length).toBeLessThanOrEqual(maxPoints)
    expect(sampled[0].timeMs).toBe(curve[0].timeMs)
    expect(sampled[sampled.length - 1].timeMs).toBe(curve[curve.length - 1].timeMs)

    // O pico de 999 deve estar presente
    const peakPoint = sampled.find((p) => p.amountMg === 999)
    expect(peakPoint).toBeDefined()
    expect(peakPoint?.timeMs).toBe(curve[1234].timeMs)

    // Estritamente crescente
    for (let i = 1; i < sampled.length; i++) {
      expect(sampled[i].timeMs).toBeGreaterThan(sampled[i - 1].timeMs)
    }

    // Determinístico
    const sampled2 = sampleForDisplay(curve, { displayWindow, maxPoints })
    expect(sampled).toEqual(sampled2)
  })

  it('não muta o array original nem os objetos da curva', () => {
    const original = Object.freeze([
      Object.freeze({ timeMs: 1000, amountMg: 10 }),
      Object.freeze({ timeMs: 2000, amountMg: 20 }),
      Object.freeze({ timeMs: 3000, amountMg: 30 }),
    ])

    expect(() => sampleForDisplay(original, { displayWindow })).not.toThrow()
  })
})
