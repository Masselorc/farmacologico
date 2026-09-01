import { describe, expect, it } from 'vitest'
import { derivePhaseHint } from '../../../features/comparator/lib/phaseHint'
import type { Dose } from '../../../domain/types'

describe('derivePhaseHint', () => {
  it('returns awaiting_first_dose when no doses or all in future', () => {
    expect(derivePhaseHint([], 100)).toBe('awaiting_first_dose')
    
    // Future dose
    const doses = [{ id: '1', amountMg: 10, time: '2026-09-01T14:00:00Z' }]
    const nowMs = new Date('2026-09-01T12:00:00Z').getTime()
    expect(derivePhaseHint(doses, nowMs)).toBe('awaiting_first_dose')
  })

  it('returns terminal_decline if all doses in past', () => {
    const doses = [{ id: '1', amountMg: 10, time: '2026-09-01T10:00:00Z' }]
    const nowMs = new Date('2026-09-01T12:00:00Z').getTime()
    expect(derivePhaseHint(doses, nowMs)).toBe('terminal_decline')
  })
})
