import { describe, expect, it } from 'vitest'
import { DOMAIN_LIMITS, HALF_LIFE_MS_MAX, TMAX_MS_MAX } from '../../validation/limits'
import { pkParametersSnapshotSchema, selectedPkParametersSchema } from '../../validation/schemas/pk'

describe('E5 PK Schemas — SelectedPkParameters & PkParametersSnapshot (§6)', () => {
  describe('selectedPkParametersSchema', () => {
    it('aceita meia-vida válida e Tmax nulo (absorção instantânea / IV)', () => {
      const parsed = selectedPkParametersSchema.safeParse({
        halfLifeMs: 86_400_000,
        tmaxMs: null,
      })
      expect(parsed.success).toBe(true)
    })

    it('aceita meia-vida válida e Tmax válido (absorção de 1ª ordem)', () => {
      const parsed = selectedPkParametersSchema.safeParse({
        halfLifeMs: 86_400_000,
        tmaxMs: 3600_000,
      })
      expect(parsed.success).toBe(true)
    })

    it('aceita fronteiras exatas de meia-vida: 1 ms e 3650 dias', () => {
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: DOMAIN_LIMITS.HALF_LIFE_MS_MIN, tmaxMs: null }).success).toBe(true)
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: HALF_LIFE_MS_MAX, tmaxMs: null }).success).toBe(true)
    })

    it('rejeita meia-vida fora dos limites (0 ms, negativo, >3650 dias, NaN, Infinity)', () => {
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: 0, tmaxMs: null }).success).toBe(false)
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: -100, tmaxMs: null }).success).toBe(false)
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: HALF_LIFE_MS_MAX + 1, tmaxMs: null }).success).toBe(false)
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: NaN, tmaxMs: null }).success).toBe(false)
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: Infinity, tmaxMs: null }).success).toBe(false)
    })

    it('aceita fronteiras exatas de Tmax: 0 ms e 3650 dias', () => {
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: 1000, tmaxMs: 0 }).success).toBe(true)
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: 1000, tmaxMs: TMAX_MS_MAX }).success).toBe(true)
    })

    it('rejeita Tmax fora dos limites (negativo, >3650 dias, NaN, Infinity)', () => {
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: 1000, tmaxMs: -1 }).success).toBe(false)
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: 1000, tmaxMs: TMAX_MS_MAX + 1 }).success).toBe(false)
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: 1000, tmaxMs: NaN }).success).toBe(false)
      expect(selectedPkParametersSchema.safeParse({ halfLifeMs: 1000, tmaxMs: Infinity }).success).toBe(false)
    })

    it('aceita selectionNote opcional com range e chosenBy user', () => {
      const parsed = selectedPkParametersSchema.safeParse({
        halfLifeMs: 86_400_000,
        tmaxMs: 3600_000,
        selectionNote: {
          range: {
            halfLife: { min: { value: 1, unit: 'days' }, max: { value: 2, unit: 'days' } },
          },
          chosenBy: 'user',
        },
      })
      expect(parsed.success).toBe(true)
    })
  })

  describe('pkParametersSnapshotSchema', () => {
    it('valida snapshot completo com halfLife e tmax nulo ou estruturado', () => {
      const snapshot1 = {
        halfLife: { value: 24, unit: 'hours' },
        tmax: null,
      }
      expect(pkParametersSnapshotSchema.safeParse(snapshot1).success).toBe(true)

      const snapshot2 = {
        halfLife: { value: 5, unit: 'days' },
        tmax: { value: 12, unit: 'hours' },
      }
      expect(pkParametersSnapshotSchema.safeParse(snapshot2).success).toBe(true)
    })
  })
})
