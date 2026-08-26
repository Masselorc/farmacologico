import { z } from 'zod'
import type { Dose, DoseDraft, Scenario, ScenarioSource } from '../../domain/types'
import { SAFETY_LIMITS } from '../limits'
import { pkParametersSnapshotSchema, selectedPkParametersSchema } from './pk'
import { instantIsoSchema, localDateSchema, localTimeSchema, massUnitSchema, nameSchema, nonEmptyStringSchema } from './primitives'

// Schemas de doses e cenários de simulação (§6, "Comparador").

export const doseSchema: z.ZodType<Dose> = z.object({
  id: nonEmptyStringSchema,
  amountMg: z.number().refine(
    (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX,
    { message: `Quantidade da dose deve ser maior que zero e até ${SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX} mg` },
  ),
  time: instantIsoSchema,
})

export const doseDraftSchema: z.ZodType<DoseDraft> = z.object({
  id: nonEmptyStringSchema,
  amountMg: z.union([
    z.null(),
    z.number().refine(
      (v) => Number.isFinite(v) && v > 0 && v <= SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX,
      { message: `Quantidade da dose deve ser maior que zero e até ${SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX} mg` },
    ),
  ]),
  localDate: localDateSchema.optional(),
  localTime: localTimeSchema.optional(),
})

export const scenarioSourceSchema: z.ZodType<ScenarioSource> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('library'),
    substanceId: nonEmptyStringSchema,
    profileId: nonEmptyStringSchema,
    datasetVersion: z.number().int().nonnegative(),
    pkParametersSnapshot: pkParametersSnapshotSchema,
  }),
  z.object({
    type: z.literal('custom_profile'),
    customProfileId: nonEmptyStringSchema,
    pkParametersSnapshot: pkParametersSnapshotSchema,
  }),
  z.object({
    type: z.literal('manual'),
    pkParametersSnapshot: pkParametersSnapshotSchema.optional(),
  }),
])

export const scenarioSchema: z.ZodType<Scenario> = z.object({
  id: nonEmptyStringSchema,
  name: nameSchema,
  color: z.string().min(1, { message: 'Cor é obrigatória' }),
  source: scenarioSourceSchema.optional(),
  displayUnit: massUnitSchema,
  selectedPkParameters: selectedPkParametersSchema,
  doses: z
    .array(doseSchema)
    .max(SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX, {
      message: `Máximo de ${SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX} doses por cenário`,
    }),
})
