import { z } from 'zod'
import { validationMessages } from '../../app/i18n/pt-BR.validation'
import type { Dose, DoseDraft, Scenario, ScenarioSource } from '../../domain/types'
import { SAFETY_LIMITS } from '../limits'
import { pkParametersSnapshotSchema, selectedPkParametersSchema } from './pk'
import {
  instantIsoSchema,
  localDateSchema,
  localTimeSchema,
  massUnitSchema,
  nameSchema,
  nonEmptyStringSchema,
  paletteColorIdSchema,
} from './primitives'

// Schemas de doses e cenários de simulação (§6, "Comparador").

export const doseSchema: z.ZodType<Dose> = z.strictObject({
  id: nonEmptyStringSchema,
  amountMg: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX,
    { message: validationMessages.doseAmountRange(SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX) },
  ),
  time: instantIsoSchema,
})

export const doseDraftSchema: z.ZodType<DoseDraft> = z.strictObject({
  id: nonEmptyStringSchema,
  amountMg: z.union([
    z.null(),
    z.number().refine(
      (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX,
      { message: validationMessages.doseAmountRange(SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX) },
    ),
  ]),
  localDate: localDateSchema.optional(),
  localTime: localTimeSchema.optional(),
})

export const scenarioSourceSchema: z.ZodType<ScenarioSource> = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('library'),
    substanceId: nonEmptyStringSchema,
    profileId: nonEmptyStringSchema,
    datasetVersion: z.number().int().nonnegative(),
    pkParametersSnapshot: pkParametersSnapshotSchema,
  }),
  z.strictObject({
    type: z.literal('custom_profile'),
    customProfileId: nonEmptyStringSchema,
    pkParametersSnapshot: pkParametersSnapshotSchema,
  }),
  z.strictObject({
    type: z.literal('manual'),
    pkParametersSnapshot: pkParametersSnapshotSchema.optional(),
  }),
])

export const scenarioSchema: z.ZodType<Scenario> = z.strictObject({
  id: nonEmptyStringSchema,
  name: nameSchema,
  color: paletteColorIdSchema,
  source: scenarioSourceSchema,
  displayUnit: massUnitSchema,
  selectedPkParameters: selectedPkParametersSchema,
  doses: z
    .array(doseSchema)
    .max(SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX, {
      message: validationMessages.dosesPerScenarioMax(SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX),
    }),
})
