import { describe, expect, it } from 'vitest'
import { SAFETY_LIMITS } from '../../validation/limits'
import { reconstitutionInputSchema, syringeSchema } from '../../validation/schemas/reconstitution'

describe('E5 Reconstitution Schemas (§6)', () => {
  const validSyringe = {
    family: 'U-100' as const,
    capacityUnits: 100,
    unitsPerMl: 100 as const,
    graduationUnits: 1,
  }

  describe('syringeSchema', () => {
    it('aceita seringa U-100 padrão com graduações inteiras ou decimais', () => {
      expect(syringeSchema.safeParse(validSyringe).success).toBe(true)
      expect(syringeSchema.safeParse({ ...validSyringe, graduationUnits: 0.5 }).success).toBe(true)
      expect(syringeSchema.safeParse({ ...validSyringe, graduationUnits: 2 }).success).toBe(true)
    })

    it('rejeita graduação <= 0, > 100 U, NaN ou Infinity', () => {
      expect(syringeSchema.safeParse({ ...validSyringe, graduationUnits: 0 }).success).toBe(false)
      expect(syringeSchema.safeParse({ ...validSyringe, graduationUnits: -1 }).success).toBe(false)
      expect(syringeSchema.safeParse({ ...validSyringe, graduationUnits: SAFETY_LIMITS.SYRINGE_GRADUATION_UNITS_MAX + 1 }).success).toBe(false)
      expect(syringeSchema.safeParse({ ...validSyringe, graduationUnits: NaN }).success).toBe(false)
    })

    it('rejeita família diferente de U-100 ou unitsPerMl diferente de 100', () => {
      expect(syringeSchema.safeParse({ ...validSyringe, family: 'U-40' as never }).success).toBe(false)
      expect(syringeSchema.safeParse({ ...validSyringe, unitsPerMl: 40 as never }).success).toBe(false)
    })
  })

  describe('reconstitutionInputSchema', () => {
    it('aceita entrada de reconstituição válida', () => {
      const input = {
        vialMassMg: 5,
        diluentVolumeMl: 2,
        desiredDoseMcg: 250,
        syringe: validSyringe,
      }
      expect(reconstitutionInputSchema.safeParse(input).success).toBe(true)
    })

    it('aceita fronteiras máximas normativas de reconstituição', () => {
      const maxInput = {
        vialMassMg: SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX,
        diluentVolumeMl: SAFETY_LIMITS.RECON_DILUENT_ML_MAX,
        desiredDoseMcg: SAFETY_LIMITS.RECON_DOSE_MCG_MAX,
        syringe: validSyringe,
      }
      expect(reconstitutionInputSchema.safeParse(maxInput).success).toBe(true)
    })

    it('rejeita valores <= 0 ou acima dos limites de segurança', () => {
      // vialMassMg
      expect(reconstitutionInputSchema.safeParse({ vialMassMg: 0, diluentVolumeMl: 2, desiredDoseMcg: 250, syringe: validSyringe }).success).toBe(false)
      expect(reconstitutionInputSchema.safeParse({ vialMassMg: SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX + 1, diluentVolumeMl: 2, desiredDoseMcg: 250, syringe: validSyringe }).success).toBe(false)

      // diluentVolumeMl
      expect(reconstitutionInputSchema.safeParse({ vialMassMg: 5, diluentVolumeMl: 0, desiredDoseMcg: 250, syringe: validSyringe }).success).toBe(false)
      expect(reconstitutionInputSchema.safeParse({ vialMassMg: 5, diluentVolumeMl: SAFETY_LIMITS.RECON_DILUENT_ML_MAX + 1, desiredDoseMcg: 250, syringe: validSyringe }).success).toBe(false)

      // desiredDoseMcg
      expect(reconstitutionInputSchema.safeParse({ vialMassMg: 5, diluentVolumeMl: 2, desiredDoseMcg: 0, syringe: validSyringe }).success).toBe(false)
      expect(reconstitutionInputSchema.safeParse({ vialMassMg: 5, diluentVolumeMl: 2, desiredDoseMcg: SAFETY_LIMITS.RECON_DOSE_MCG_MAX + 1, syringe: validSyringe }).success).toBe(false)
    })
  })
})
