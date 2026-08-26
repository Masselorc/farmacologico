import { z } from 'zod'
import { validationMessages } from '../../app/i18n/pt-BR.messages'
import { proportionSumClose } from '../../domain/shared/tolerances'
import type { Protocol, ProtocolComponent, ProtocolComponentSource } from '../../domain/types'
import { SAFETY_LIMITS } from '../limits'
import { pkParametersSnapshotSchema, selectedPkParametersSchema } from './pk'
import { displayColorSchema, instantIsoSchema, nameSchema, nonEmptyStringSchema } from './primitives'
import { scheduleSchema } from './recurrence'

// Schemas de protocolos de administração e componentes (§6, "Protocolos").

export const protocolComponentSourceSchema: z.ZodType<ProtocolComponentSource> = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('library'),
    substanceId: nonEmptyStringSchema,
    profileId: nonEmptyStringSchema,
    datasetVersion: z.number().int().nonnegative(),
  }),
  z.strictObject({
    type: z.literal('custom_profile'),
    customProfileId: nonEmptyStringSchema,
  }),
  z.strictObject({
    type: z.literal('manual'),
  }),
])

export const protocolComponentSchema: z.ZodType<ProtocolComponent> = z.strictObject({
  id: nonEmptyStringSchema,
  label: nonEmptyStringSchema,
  proportion: z.number().refine((p) => Number.isFinite(p) && p > 0, {
    message: validationMessages.protocolComponentProportionInvalid,
  }),
  source: protocolComponentSourceSchema,
  selectedPkParameters: selectedPkParametersSchema,
  pkParametersSnapshot: pkParametersSnapshotSchema,
  displayColor: displayColorSchema,
})

export const protocolSchema: z.ZodType<Protocol> = z
  .strictObject({
    id: nonEmptyStringSchema,
    name: nameSchema,
    totalDoseMg: z.number().refine(
      (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.PROTOCOL_TOTAL_DOSE_MG_MAX,
      { message: validationMessages.protocolTotalDoseRange(SAFETY_LIMITS.PROTOCOL_TOTAL_DOSE_MG_MAX) },
    ),
    schedule: scheduleSchema,
    components: z
      .array(protocolComponentSchema)
      .min(1, { message: validationMessages.protocolComponentsMin })
      .max(SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX, {
        message: validationMessages.protocolComponentsMax(SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX),
      }),
    createdAt: instantIsoSchema,
    updatedAt: instantIsoSchema,
  })
  .superRefine((data, ctx) => {
    // 1. Unicidade de ID de componente dentro do Protocol
    const seenIds = new Set<string>()
    for (let i = 0; i < data.components.length; i++) {
      const comp = data.components[i]!
      if (seenIds.has(comp.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: validationMessages.protocolDuplicateComponentId(comp.id),
          path: ['components', i, 'id'],
        })
      }
      seenIds.add(comp.id)
    }

    // 2. Proporções devem ser todas finitas > 0
    const invalidProportions = data.components.some((c) => !Number.isFinite(c.proportion) || c.proportion <= 0)
    if (invalidProportions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validationMessages.protocolComponentProportionInvalid,
        path: ['components'],
      })
    }

    // 3. Soma das proporções deve ser 1 (via proportionSumClose com tolerância 1e-12)
    const proportions = data.components.map((c) => c.proportion)
    if (!proportionSumClose(proportions)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validationMessages.protocolComponentProportionsSumOne,
        path: ['components'],
      })
    }

    // 4. Cada dose derivada deve ser finita > 0 e <= SIMULATION_DOSE_MG_MAX
    for (let i = 0; i < data.components.length; i++) {
      const comp = data.components[i]!
      const derivedDose = data.totalDoseMg * comp.proportion
      if (!Number.isFinite(derivedDose) || derivedDose <= 0 || derivedDose > SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: validationMessages.protocolDerivedDoseInvalid(comp.id, derivedDose),
          path: ['components', i, 'proportion'],
        })
      }
    }
  })
