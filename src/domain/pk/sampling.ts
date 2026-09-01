import type { DisplayPoint, DisplayWindow } from '../types'

export interface DisplaySamplingConstraints {
  displayWindow: DisplayWindow
  maxPoints?: number
}

const DEFAULT_MAX_POINTS = 1200

/**
 * Reamostragem puramente geométrica da curva de análise para exibição gráfica (§15, E9).
 * - Função pura e determinística, sem mutação do input.
 * - Filtra estritamente dentro da DisplayWindow.
 * - Limita o número de pontos a no máximo maxPoints (default 1200).
 * - Preserva obrigatoriamente: primeiro ponto, último ponto e o ponto de maior amountMg na janela.
 */
export function sampleForDisplay(
  analysisCurve: ReadonlyArray<{ timeMs: number; amountMg: number }>,
  constraints: DisplaySamplingConstraints,
): DisplayPoint[] {
  const maxPoints = constraints.maxPoints ?? DEFAULT_MAX_POINTS
  const { startMs, endMs } = constraints.displayWindow

  const filtered = analysisCurve.filter(
    (point) => point.timeMs >= startMs && point.timeMs <= endMs,
  )

  if (filtered.length <= maxPoints) {
    return filtered.map((p) => ({
      timeMs: p.timeMs,
      amountMg: p.amountMg,
      clippedBelowLogEpsilon: false,
    }))
  }

  let maxAmountIdx = 0
  let maxAmount = -Infinity
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i].amountMg > maxAmount) {
      maxAmount = filtered[i].amountMg
      maxAmountIdx = i
    }
  }

  const selectedIndices = new Set<number>()
  selectedIndices.add(0)
  selectedIndices.add(filtered.length - 1)
  selectedIndices.add(maxAmountIdx)

  const step = (filtered.length - 1) / (maxPoints - 1)
  for (let i = 1; i < maxPoints - 1; i++) {
    selectedIndices.add(Math.round(i * step))
  }

  let finalIndices = Array.from(selectedIndices).sort((a, b) => a - b)
  if (finalIndices.length > maxPoints) {
    const essential = new Set([0, filtered.length - 1, maxAmountIdx])
    const nonEssential = finalIndices.filter((idx) => !essential.has(idx))
    const toRemoveCount = finalIndices.length - maxPoints
    const stepRemove = nonEssential.length / toRemoveCount
    const removeSet = new Set<number>()
    for (let r = 0; r < toRemoveCount; r++) {
      removeSet.add(nonEssential[Math.floor(r * stepRemove)])
    }
    finalIndices = finalIndices.filter((idx) => !removeSet.has(idx)).sort((a, b) => a - b)
  }

  return finalIndices.map((idx) => ({
    timeMs: filtered[idx].timeMs,
    amountMg: filtered[idx].amountMg,
    clippedBelowLogEpsilon: false,
  }))
}
