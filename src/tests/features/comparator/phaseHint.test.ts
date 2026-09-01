import { describe, expect, it } from 'vitest'
import { derivePhaseHint } from '../../../features/comparator/lib/phaseHint'
import { MS_PER_DAY, MS_PER_HOUR } from '../../../domain/units/convert'

describe('derivePhaseHint (§15, E9)', () => {
  const baseNow = 1_000_000_000_000 // referencial determinístico

  it('retorna awaiting_first_dose quando não há doses passadas e existe dose futura', () => {
    const doses = [{ timeMs: baseNow + 1 * MS_PER_DAY }]
    const hint = derivePhaseHint(doses, 2 * MS_PER_HOUR, baseNow)
    expect(hint).toBe('awaiting_first_dose')
  })

  it('retorna absorbing_latest quando a dose mais recente está dentro da janela de Tmax', () => {
    const doses = [{ timeMs: baseNow - 1 * MS_PER_HOUR }]
    const tmaxMs = 2 * MS_PER_HOUR // absorção até baseNow + 1h
    const hint = derivePhaseHint(doses, tmaxMs, baseNow)
    expect(hint).toBe('absorbing_latest')
  })

  it('retorna awaiting_next_planned quando passou do Tmax e existe próxima dose futura', () => {
    const doses = [
      { timeMs: baseNow - 5 * MS_PER_HOUR }, // passado, fora do Tmax
      { timeMs: baseNow + 10 * MS_PER_HOUR }, // futuro
    ]
    const tmaxMs = 2 * MS_PER_HOUR
    const hint = derivePhaseHint(doses, tmaxMs, baseNow)
    expect(hint).toBe('awaiting_next_planned')
  })

  it('retorna terminal_decline quando passou do Tmax e não há dose futura', () => {
    const doses = [{ timeMs: baseNow - 5 * MS_PER_HOUR }]
    const tmaxMs = 2 * MS_PER_HOUR
    const hint = derivePhaseHint(doses, tmaxMs, baseNow)
    expect(hint).toBe('terminal_decline')
  })

  it('retorna awaiting_first_dose para array vazio', () => {
    const hint = derivePhaseHint([], 2 * MS_PER_HOUR, baseNow)
    expect(hint).toBe('awaiting_first_dose')
  })
})
