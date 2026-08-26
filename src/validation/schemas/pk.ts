import { z } from 'zod'
import type { PkParametersSnapshot, SelectedPkParameters } from '../../domain/types'
import { DOMAIN_LIMITS, HALF_LIFE_MS_MAX, TMAX_MS_MAX } from '../limits'
import { durationRangeSchema, durationValueSchema } from './primitives'

// Schemas de parâmetros farmacocinéticos (§6, "SelectedPkParameters", "PkParametersSnapshot").

export const selectedPkParametersSchema: z.ZodType<SelectedPkParameters> = z.object({
  halfLifeMs: z.number().refine(
    (v) => Number.isFinite(v) && v >= DOMAIN_LIMITS.HALF_LIFE_MS_MIN && v <= HALF_LIFE_MS_MAX,
    { message: `Meia-vida deve estar entre ${DOMAIN_LIMITS.HALF_LIFE_MS_MIN} ms e 3650 dias` },
  ),
  tmaxMs: z.union([
    z.null(),
    z.number().refine(
      (v) => Number.isFinite(v) && v >= 0 && v <= TMAX_MS_MAX,
      { message: 'Tmax deve ser nulo ou estar entre 0 e 3650 dias' },
    ),
  ]),
  selectionNote: z
    .object({
      range: z.object({
        halfLife: durationRangeSchema.optional(),
        tmaxRange: durationRangeSchema.optional(),
      }),
      chosenBy: z.literal('user'),
    })
    .optional(),
})

export const pkParametersSnapshotSchema: z.ZodType<PkParametersSnapshot> = z.object({
  halfLife: durationValueSchema,
  tmax: z.union([durationValueSchema, z.null()]),
  selectedFromRange: z
    .object({
      halfLife: durationRangeSchema.optional(),
      tmax: durationRangeSchema.optional(),
    })
    .optional(),
})
