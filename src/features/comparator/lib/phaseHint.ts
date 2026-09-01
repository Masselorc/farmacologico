import type { Dose } from '../../../domain/types'

export type PhaseHint = 'awaiting_first_dose' | 'absorbing_latest' | 'awaiting_next_planned' | 'terminal_decline'

export function derivePhaseHint(doses: ReadonlyArray<Dose>, nowMs: number): PhaseHint {
  if (doses.length === 0) return 'awaiting_first_dose'
  
  let hasPast = false
  for (const dose of doses) {
    const timeMs = new Date(dose.time).getTime()
    if (timeMs <= nowMs) hasPast = true
  }
  
  if (!hasPast) return 'awaiting_first_dose'
  return 'terminal_decline'
}
