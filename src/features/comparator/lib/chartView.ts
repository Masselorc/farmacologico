import { LOG_REL_EPSILON } from '../../../domain/shared/tolerances'
import type {
  ChartScaleMode,
  ChartSnapshotPoint,
  ChartYAxisMode,
  DisplayPoint,
  SimulationOutput,
} from '../../../domain/types'

export interface CreateChartSnapshotPointsParams {
  displayPoints: ReadonlyArray<DisplayPoint>
  result: SimulationOutput
  scaleMode: ChartScaleMode
  yAxisMode: ChartYAxisMode
}

/**
 * Prepara pontos para persistência no ChartViewSnapshot e renderização visual (§15, E9).
 * - Absoluta: value = amountMg, valueKind = 'mg'.
 * - Normalizada: value = amountMg / result.peak.amountMg, valueKind = 'normalized_ratio'.
 * - Log: floor = peak * LOG_REL_EPSILON (absoluto) ou LOG_REL_EPSILON (normalizado).
 * - Clipping marca clippedBelowLogEpsilon = true sem NUNCA substituir o valor científico.
 */
export function createChartSnapshotPoints(
  params: CreateChartSnapshotPointsParams,
): ChartSnapshotPoint[] {
  const { displayPoints, result, scaleMode, yAxisMode } = params
  const seriesPeakMg = result.peak.amountMg

  if (scaleMode === 'absolute') {
    if (yAxisMode === 'linear') {
      return displayPoints.map((point) => ({
        timeMs: point.timeMs,
        value: point.amountMg,
        valueKind: 'mg',
      }))
    }

    // Absolute Log
    const floor = seriesPeakMg > 0 ? seriesPeakMg * LOG_REL_EPSILON : 0
    return displayPoints.map((point) => ({
      timeMs: point.timeMs,
      value: point.amountMg,
      valueKind: 'mg',
      clippedBelowLogEpsilon: point.amountMg <= floor,
    }))
  }

  // scaleMode === 'normalized'
  const denominator = seriesPeakMg > 0 ? seriesPeakMg : 1

  if (yAxisMode === 'linear') {
    return displayPoints.map((point) => {
      const ratio = seriesPeakMg > 0 ? Math.min(1, Math.max(0, point.amountMg / denominator)) : 0
      return {
        timeMs: point.timeMs,
        value: ratio,
        valueKind: 'normalized_ratio',
      }
    })
  }

  // Normalized Log
  const floor = LOG_REL_EPSILON
  return displayPoints.map((point) => {
    const ratio = seriesPeakMg > 0 ? Math.min(1, Math.max(0, point.amountMg / denominator)) : 0
    return {
      timeMs: point.timeMs,
      value: ratio,
      valueKind: 'normalized_ratio',
      clippedBelowLogEpsilon: ratio <= floor,
    }
  })
}
