import { z } from 'zod'
import {
  administrationRouteSchema,
  substanceCategorySchema,
  tmaxSpecificationSchema,
} from './data-management'
import { displayColorSchema, durationSchema, instantIsoSchema } from './primitives'
import { SAFETY_LIMITS, UX_LIMITS } from '../limits'
import { proportionSumClose } from '../../domain/shared/tolerances'

export const profileOriginSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('legacy_unattributed'),
    reviewStatus: z.enum(['legacy_unreviewed', 'needs_review', 'reviewed']),
  }),
  z.strictObject({
    kind: z.literal('literature'),
    reviewStatus: z.enum(['needs_review', 'reviewed']),
    sourceIds: z.array(z.string().min(1)).min(1, 'sourceIds não pode ser vazio para origin literature'),
  }),
  z.strictObject({
    kind: z.literal('user_defined'),
    reviewStatus: z.literal('not_applicable'),
  }),
])

export const sourceSchema = z.strictObject({
  id: z.string().min(1),
  doi: z.string().optional(),
  pmid: z.string().optional(),
  url: z.string().url().optional(),
  title: z.string().optional(),
  authors: z.array(z.string()).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  population: z.string().optional(),
  notes: z.string().optional(),
  reviewedAt: instantIsoSchema.optional(),
})

export const pharmacokineticProfileSchema = z.strictObject({
  id: z.string().min(1),
  route: administrationRouteSchema,
  formulation: z.string().optional(),
  ester: z.string().optional(),
  halfLife: durationSchema,
  tmaxSpec: tmaxSpecificationSchema,
  bioavailability: z
    .union([
      z.number().min(0).max(1),
      z.strictObject({ min: z.number().min(0).max(1), max: z.number().min(0).max(1) }),
    ])
    .optional(),
  populationContext: z.string().optional(),
  origin: profileOriginSchema,
  deprecated: z.boolean().optional(),
})

export const singleSubstanceSchema = z.strictObject({
  kind: z.literal('single'),
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1).max(UX_LIMITS.NAME_MAX_CHARS),
  aliases: z.array(z.string()),
  category: substanceCategorySchema,
  tags: z.array(z.string()),
  profiles: z.array(pharmacokineticProfileSchema).min(1),
  componentOnly: z.boolean().optional(),
  deprecated: z.boolean().optional(),
})

export const blendComponentSchema = z.strictObject({
  substanceId: z.string().min(1),
  profileId: z.string().min(1),
  proportion: z.number().finite().gt(0, 'proportion deve ser maior que 0').lte(1),
  displayColor: displayColorSchema.optional(),
})

export const blendSubstanceSchema = z.strictObject({
  kind: z.literal('blend'),
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1).max(UX_LIMITS.NAME_MAX_CHARS),
  aliases: z.array(z.string()),
  tags: z.array(z.string()),
  components: z
    .array(blendComponentSchema)
    .min(1, 'Blend deve ter ao menos um componente')
    .max(SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX, `Máximo de ${SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX} componentes`)
    .refine((comps) => proportionSumClose(comps.map((c) => c.proportion)), {
      message: 'A soma das proporções dos componentes do Blend deve ser 1',
    }),
  origin: profileOriginSchema,
  deprecated: z.boolean().optional(),
})

export const substanceSchema = z.discriminatedUnion('kind', [
  singleSubstanceSchema,
  blendSubstanceSchema,
])

export const datasetIdMigrationSchema = z.discriminatedUnion('entityKind', [
  z.strictObject({
    entityKind: z.literal('substance'),
    fromId: z.string().min(1),
    toId: z.string().min(1),
    sinceDatasetVersion: z.number().int().min(1),
    reason: z.string().min(1),
  }),
  z.strictObject({
    entityKind: z.literal('profile'),
    fromSubstanceId: z.string().min(1),
    fromProfileId: z.string().min(1),
    toSubstanceId: z.string().min(1),
    toProfileId: z.string().min(1),
    sinceDatasetVersion: z.number().int().min(1),
    reason: z.string().min(1),
  }),
])

export const datasetMetadataSchema = z.strictObject({
  datasetVersion: z.number().int().min(1),
  updatedAt: instantIsoSchema,
  substanceCount: z.number().int().min(0),
  changelog: z
    .array(
      z.strictObject({
        version: z.number().int().min(1),
        date: instantIsoSchema,
        summary: z.string().min(1),
      }),
    )
    .optional(),
  idMigrations: z.array(datasetIdMigrationSchema).optional(),
})

export const officialDatasetSchema = z.strictObject({
  metadata: datasetMetadataSchema,
  sources: z.array(sourceSchema),
  substances: z.array(substanceSchema),
})
