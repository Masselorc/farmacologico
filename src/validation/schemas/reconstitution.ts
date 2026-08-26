import { z } from 'zod'
import type { ReconstitutionInput, Syringe } from '../../domain/types'
import { SAFETY_LIMITS } from '../limits'
import { positiveFiniteNumberSchema } from './primitives'

// Schemas de reconstituição e seringas (§6, "Reconstituição").

export const syringeSchema: z.ZodType<Syringe> = z.object({
  family: z.literal('U-100'),
  capacityUnits: positiveFiniteNumberSchema,
  unitsPerMl: z.literal(100),
  graduationUnits: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.SYRINGE_GRADUATION_UNITS_MAX,
    { message: `Graduação da seringa deve ser maior que zero e até ${SAFETY_LIMITS.SYRINGE_GRADUATION_UNITS_MAX} U` },
  ),
})

export const reconstitutionInputSchema: z.ZodType<ReconstitutionInput> = z.object({
  vialMassMg: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX,
    { message: `Massa do frasco deve ser maior que zero e até ${SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX} mg` },
  ),
  diluentVolumeMl: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.RECON_DILUENT_ML_MAX,
    { message: `Volume de diluente deve ser maior que zero e até ${SAFETY_LIMITS.RECON_DILUENT_ML_MAX} mL` },
  ),
  desiredDoseMcg: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.RECON_DOSE_MCG_MAX,
    { message: `Dose desejada deve ser maior que zero e até ${SAFETY_LIMITS.RECON_DOSE_MCG_MAX} mcg` },
  ),
  syringe: syringeSchema,
  label: z.string().optional(),
})
