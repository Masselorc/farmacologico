import { z } from 'zod'
import { validationMessages } from '../../app/i18n/pt-BR.messages'
import type { ReconstitutionInput, Syringe } from '../../domain/types'
import { SAFETY_LIMITS } from '../limits'
import { positiveFiniteNumberSchema } from './primitives'

// Schemas de reconstituição e seringas (§6, "Reconstituição").

export const syringeSchema: z.ZodType<Syringe> = z.strictObject({
  family: z.literal('U-100'),
  capacityUnits: positiveFiniteNumberSchema,
  unitsPerMl: z.literal(100),
  graduationUnits: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.SYRINGE_GRADUATION_UNITS_MAX,
    { message: validationMessages.syringeGraduationRange(SAFETY_LIMITS.SYRINGE_GRADUATION_UNITS_MAX) },
  ),
})

export const reconstitutionInputSchema: z.ZodType<ReconstitutionInput> = z.strictObject({
  vialMassMg: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX,
    { message: validationMessages.vialMassRange(SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX) },
  ),
  diluentVolumeMl: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.RECON_DILUENT_ML_MAX,
    { message: validationMessages.diluentVolumeRange(SAFETY_LIMITS.RECON_DILUENT_ML_MAX) },
  ),
  desiredDoseMcg: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.RECON_DOSE_MCG_MAX,
    { message: validationMessages.desiredDoseRange(SAFETY_LIMITS.RECON_DOSE_MCG_MAX) },
  ),
  syringe: syringeSchema,
  label: z.string().optional(),
})
