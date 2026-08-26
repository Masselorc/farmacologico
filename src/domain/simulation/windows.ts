import { cutoffAgeFor } from '../pk/cutoff'
import type { CalculationWindow, DisplayWindow, SelectedPkParameters } from '../types'
import { domainError } from '../shared/errors'

// requiredPkLookback === max(cutoffAgeFor(params_i)) — invariante normativa (§7).
// Nenhuma feature calcula lookback próprio.

export function requiredPkLookback(parameters: ReadonlyArray<SelectedPkParameters>): number {
  let maxAgeMs = 0
  for (const selected of parameters) {
    const ageMs = cutoffAgeFor(selected)
    if (ageMs > maxAgeMs) {
      maxAgeMs = ageMs
    }
  }
  return maxAgeMs
}

export function deriveCalculationWindow(
  displayWindow: DisplayWindow,
  parameters: ReadonlyArray<SelectedPkParameters>,
): CalculationWindow {
  if (
    !Number.isFinite(displayWindow.startMs) ||
    !Number.isFinite(displayWindow.endMs) ||
    displayWindow.startMs >= displayWindow.endMs
  ) {
    throw domainError('INVALID_HORIZON', {
      startMs: displayWindow.startMs,
      endMs: displayWindow.endMs,
    })
  }

  const startMs = displayWindow.startMs - requiredPkLookback(parameters)
  return { startMs, endMs: displayWindow.endMs }
}
