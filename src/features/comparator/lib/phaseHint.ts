import { instantIsoToEpochMs } from '../../../domain/simulation/assemble'
import type { Dose } from '../../../domain/types'

export type PhaseHint =
  | 'awaiting_first_dose'
  | 'absorbing_latest'
  | 'awaiting_next_planned'
  | 'terminal_decline'

/**
 * Heurística determinística de fase de modelo para UI (§15, E9).
 * Não altera a farmacocinética nem o SimulationOutput.
 */
export function derivePhaseHint(
  doses: ReadonlyArray<Dose | { timeMs: number }>,
  tmaxMs: number | null,
  nowMs: number,
): PhaseHint {
  if (doses.length === 0) return 'awaiting_first_dose'

  const times = doses
    .map((d) => ('timeMs' in d ? d.timeMs : instantIsoToEpochMs(d.time)))
    .sort((a, b) => a - b)

  const pastTimes = times.filter((t) => t <= nowMs)
  const futureTimes = times.filter((t) => t > nowMs)

  // Caso 1: Nenhuma dose passada e existe dose futura
  if (pastTimes.length === 0 && futureTimes.length > 0) {
    return 'awaiting_first_dose'
  }

  // Caso 2: Em absorção da dose mais recente
  if (pastTimes.length > 0) {
    const latestTime = pastTimes[pastTimes.length - 1]
    if (tmaxMs !== null && tmaxMs > 0 && nowMs < latestTime + tmaxMs) {
      return 'absorbing_latest'
    }
  }

  // Caso 3: Fora da janela de absorção e existe próxima dose planejada
  if (futureTimes.length > 0) {
    return 'awaiting_next_planned'
  }

  // Caso 4: Sem próxima dose futura (declínio terminal)
  return 'terminal_decline'
}
