import { z } from 'zod'
import { validationMessages } from '../../app/i18n/pt-BR.validation'
import type { PkParametersSnapshot, SelectedPkParameters } from '../../domain/types'
import { DOMAIN_LIMITS, HALF_LIFE_MS_MAX, SAFETY_LIMITS, TMAX_MS_MAX } from '../limits'
import { durationRangeSchema, durationValueSchema } from './primitives'

// Schemas de parâmetros farmacocinéticos (§6, "SelectedPkParameters", "PkParametersSnapshot").

export const selectedPkParametersSchema: z.ZodType<SelectedPkParameters> = z.strictObject({
  halfLifeMs: z.number().refine(
    (v) => Number.isFinite(v) && v >= DOMAIN_LIMITS.HALF_LIFE_MS_MIN && v <= HALF_LIFE_MS_MAX,
    { message: validationMessages.halfLifeRange(DOMAIN_LIMITS.HALF_LIFE_MS_MIN, SAFETY_LIMITS.HALF_LIFE_DAYS_MAX) },
  ),
  tmaxMs: z.union([
    z.null(),
    z.number().refine(
      (v) => Number.isFinite(v) && v >= 0 && v <= TMAX_MS_MAX,
      { message: validationMessages.tmaxRange(SAFETY_LIMITS.TMAX_DAYS_MAX) },
    ),
  ]),
  selectionNote: z
    .strictObject({
      range: z.strictObject({
        halfLife: durationRangeSchema.optional(),
        tmaxRange: durationRangeSchema.optional(),
      }),
      chosenBy: z.literal('user'),
    })
    .optional(),
})

export const pkParametersSnapshotSchema: z.ZodType<PkParametersSnapshot> = z.strictObject({
  halfLife: durationValueSchema,
  tmax: z.union([durationValueSchema, z.null()]),
  selectedFromRange: z
    .strictObject({
      halfLife: durationRangeSchema.optional(),
      tmax: durationRangeSchema.optional(),
    })
    .optional(),
})
