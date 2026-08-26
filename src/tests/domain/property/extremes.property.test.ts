import { describe, expect, it } from 'vitest'
import { analyze } from '../../../domain/pk/analysis'
import { absorptionRateFromTmax } from '../../../domain/pk/rates'
import { stateAt } from '../../../domain/pk/state'
import { calculateReconstitution } from '../../../domain/reconstitution/calculate'
import { domainError } from '../../../domain/shared/errors'
import {
  DOMAIN_LIMITS,
  SAFETY_LIMITS,
} from '../../../validation/limits'
import { MS_PER_DAY } from './cutoff-fixtures'

// Matriz sistemática de extremos dos LIMITS: cada combinação é CLASSIFICADA
// como válida-finita ou falha-normativa; nunca NaN/Infinity silenciosos.

const HALF_LIFE_MIN = DOMAIN_LIMITS.HALF_LIFE_MS_MIN
const HALF_LIFE_MAX = SAFETY_LIMITS.HALF_LIFE_DAYS_MAX * MS_PER_DAY
const TMAX_MAX = SAFETY_LIMITS.TMAX_DAYS_MAX * MS_PER_DAY

describe('E4 extremos — classificação determinística', () => {
  it('meia-vida mínima (1 ms) instantânea: motor válido e horizonte finito', () => {
    const output = analyze({
      halfLifeMs: HALF_LIFE_MIN,
      tmaxMs: null,
      doses: [{ id: 'd', amountMg: 1, timeMs: 0 }],
      nowMs: HALF_LIFE_MIN,
    })
    expect(Number.isFinite(output.metadata.horizonEndMs)).toBe(true)
    expect(output.peak.amountMg).toBeGreaterThan(0)
  })

  it('meia-vida mínima com Tmax pequeno representável: finite>0 (subnormal aceito)', () => {
    const result = absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_MIN, tmaxMs: 1000 })
    expect(result.kaPerMs).not.toBeNull()
    expect(result.kaPerMs).toBeGreaterThan(0)
  })

  it('meia-vida mínima com Tmax máximo: ABSORPTION_SOLVER_FAILURE (nunca ka=0)', () => {
    expect.assertions(1)
    try {
      absorptionRateFromTmax({ halfLifeMs: HALF_LIFE_MIN, tmaxMs: TMAX_MAX })
    } catch (error) {
      expect((error as ReturnType<typeof domainError>).code).toBe('ABSORPTION_SOLVER_FAILURE')
    }
  })

  it('meia-vida longa + Tmax máximo em flip-flop representável permanece finita', () => {
    const output = analyze({
      halfLifeMs: 1825 * MS_PER_DAY,
      tmaxMs: 3650 * MS_PER_DAY, // Tmax >> Tcrit ⇒ ka < ke
      doses: [{ id: 'd', amountMg: 10, timeMs: 0 }],
      nowMs: MS_PER_DAY,
    })
    expect(output.warnings).toContain('FLIP_FLOP_ABSORPTION')
    expect(Number.isFinite(output.peak.amountMg)).toBe(true)
    expect(Number.isFinite(output.metadata.terminalHalfLifeMs)).toBe(true)
  })

  it('dose mínima subnormal e dose máxima nos LIMITS: estado coerente sem NaN', () => {
    for (const amountMg of [Number.MIN_VALUE, 1e-12, SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX]) {
      const state = stateAt([{ id: 'e', amountMg, timeMs: 0 }], 0, HALF_LIFE_MAX, null)
      expect(Number.isFinite(state.administeredMg)).toBe(true)
      for (const percent of [state.centralPercent, state.depotPercent, state.eliminatedPercent]) {
        expect(Number.isFinite(percent)).toBe(true)
        expect(percent).toBeGreaterThanOrEqual(0)
      }
      expect(
        Math.abs(
          state.centralPercent + state.depotPercent + state.eliminatedPercent - 1,
        ),
      ).toBeLessThanOrEqual(1e-9)
    }
  })

  it('timestamps seguros grandes: análise não degrada', () => {
    const anchor = 8_000_000_000_000 // ~ ano 2223
    const output = analyze({
      halfLifeMs: 6 * MS_PER_DAY,
      tmaxMs: null,
      doses: [{ id: 'far', amountMg: 5, timeMs: anchor }],
      nowMs: anchor + MS_PER_DAY,
    })
    expect(Number.isFinite(output.metadata.horizonEndMs)).toBe(true)
    expect(Math.abs(output.peak.timeMs - anchor)).toBeLessThanOrEqual(60_000)
  })

  it('reconstituição nos LIMITS: máximos válidos passam; acima falham normativo', () => {
    const maxOk = calculateReconstitution({
      vialMassMg: SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX,
      diluentVolumeMl: SAFETY_LIMITS.RECON_DILUENT_ML_MAX,
      desiredDoseMcg: SAFETY_LIMITS.RECON_DOSE_MCG_MAX,
      syringe: { family: 'U-100', capacityUnits: 1e9, unitsPerMl: 100, graduationUnits: 0.5 },
    })
    expect(maxOk.ok).toBe(true)

    const aboveMass = calculateReconstitution({
      vialMassMg: SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX * 2,
      diluentVolumeMl: 10,
      desiredDoseMcg: 10,
      syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 },
    })
    expect(aboveMass.ok).toBe(false)
  })

  it('nenhuma combinação da matriz retorna NaN silencioso do engine', () => {
    const halfLives = [HALF_LIFE_MIN, 60_000, MS_PER_DAY, HALF_LIFE_MAX]
    const tmaxs: Array<number | null> = [null, 0, 1000, 86_400_000, TMAX_MAX]
    for (const halfLifeMs of halfLives) {
      for (const tmaxMs of tmaxs) {
        let outcome: 'ok' | 'solver' = 'ok'
        try {
          absorptionRateFromTmax({ halfLifeMs, tmaxMs })
        } catch (error) {
          outcome = 'solver'
          expect((error as ReturnType<typeof domainError>).code).toBe('ABSORPTION_SOLVER_FAILURE')
        }
        if (outcome === 'ok') {
          const output = analyze({
            halfLifeMs,
            tmaxMs,
            doses: [{ id: 'm', amountMg: 1, timeMs: 0 }],
            nowMs: 0,
          })
          expect(Number.isFinite(output.peak.amountMg)).toBe(true)
          expect(Number.isFinite(output.currentState.centralMg)).toBe(true)
        }
      }
    }
  })
})
