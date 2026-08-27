// Schemas Zod runtime estritos para persistência, histórico e bundles de export (§6, §11).
import { z } from 'zod'
import { SAFETY_LIMITS, UX_LIMITS } from '../limits'
import {
  durationRangeSchema,
  durationSchema,
  durationValueSchema,
  instantIsoSchema,
  paletteColorIdSchema,
  timeZoneIdSchema,
} from './primitives'
import { protocolSchema } from './protocol'
import { reconstitutionInputSchema, reconstitutionResultSchema } from './reconstitution'
import { scenarioSchema } from './scenario'

// ── Configurações e Preferências ─────────────────────────────────

export const appSettingsSchema = z
  .object({
    theme: z.enum(['system', 'light', 'dark']),
    calendarTimeZone: timeZoneIdSchema,
    graduationWarnThreshold: z.number().finite().positive().optional(),
  })
  .strict()

export const substanceRefSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('official'),
      substanceId: z.string().min(1),
      datasetVersion: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      type: z.literal('custom'),
      substanceId: z.string().min(1),
    })
    .strict(),
])

export const favoritesSchema = z
  .object({
    substances: z.array(substanceRefSchema).max(UX_LIMITS.FAVORITES_MAX),
    recipeIds: z.array(z.string()),
  })
  .strict()

// ── Entidades Customizadas do Usuário ────────────────────────────

export const substanceCategorySchema = z.enum([
  'peptide',
  'steroid',
  'steroid_ester',
  'hormone',
  'other',
])

export const administrationRouteSchema = z.enum([
  'intramuscular',
  'subcutaneous',
  'sublingual',
  'oral',
  'transdermal',
  'unknown',
])

export const tmaxSpecificationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('unknown') }).strict(),
  z.object({ kind: z.literal('instant') }).strict(),
  z.object({ kind: z.literal('value'), value: durationValueSchema }).strict(),
  z.object({ kind: z.literal('range'), range: durationRangeSchema }).strict(),
])

export const customProfileOwnerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('official'), substanceId: z.string().min(1) }).strict(),
  z.object({ type: z.literal('custom'), substanceId: z.string().min(1) }).strict(),
])

export const customProfileSchema = z
  .object({
    id: z.string().min(1),
    owner: customProfileOwnerSchema,
    route: administrationRouteSchema,
    formulation: z.string().optional(),
    ester: z.string().optional(),
    halfLife: durationSchema,
    tmaxSpec: tmaxSpecificationSchema,
    bioavailability: z
      .union([
        z.number().finite().min(0).max(1),
        z
          .object({
            min: z.number().finite().min(0).max(1),
            max: z.number().finite().min(0).max(1),
          })
          .strict(),
      ])
      .optional(),
    populationContext: z.string().optional(),
    origin: z.object({ kind: z.literal('user_defined'), reviewStatus: z.literal('not_applicable') }).strict(),
    createdAt: instantIsoSchema,
    updatedAt: instantIsoSchema,
  })
  .strict()

export const customSubstanceSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1).max(UX_LIMITS.NAME_MAX_CHARS),
    aliases: z.array(z.string()),
    category: substanceCategorySchema,
    tags: z.array(z.string()),
    createdAt: instantIsoSchema,
    updatedAt: instantIsoSchema,
  })
  .strict()

export const reconstitutionRecipeSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(UX_LIMITS.NAME_MAX_CHARS),
    input: reconstitutionInputSchema,
    createdAt: instantIsoSchema,
    updatedAt: instantIsoSchema,
  })
  .strict()

// ── Estado Configurável e Persistido ─────────────────────────────

export const configPayloadSchema = z
  .object({
    settings: appSettingsSchema,
    favorites: favoritesSchema,
    customSubstances: z.array(customSubstanceSchema),
    customProfiles: z.array(customProfileSchema),
    recipes: z.array(reconstitutionRecipeSchema),
    scenarios: z.array(scenarioSchema).max(SAFETY_LIMITS.SCENARIOS_MAX),
    protocols: z.array(protocolSchema).max(SAFETY_LIMITS.PROTOCOLS_MAX),
  })
  .strict()

export const persistedStateV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    settings: appSettingsSchema,
    favorites: favoritesSchema,
    customSubstances: z.array(customSubstanceSchema),
    customProfiles: z.array(customProfileSchema),
    recipes: z.array(reconstitutionRecipeSchema),
    scenarios: z.array(scenarioSchema).max(SAFETY_LIMITS.SCENARIOS_MAX),
    protocols: z.array(protocolSchema).max(SAFETY_LIMITS.PROTOCOLS_MAX),
  })
  .strict()

// ── Quarentena Compacta ──────────────────────────────────────────

export const quarantineSourceSchema = z.enum([
  'idb_corruption',
  'config_import',
  'full_backup_import',
  'legacy_migration',
])

export const quarantineItemSchema = z
  .object({
    id: z.string().min(1),
    createdAt: instantIsoSchema,
    source: quarantineSourceSchema,
    errorCode: z.string().min(1),
    originalUtf8Bytes: z.number().int().nonnegative(),
    rawExcerptUtf8: z.string().optional(),
    truncated: z.boolean(),
  })
  .strict()

// ── Snapshots Históricos e Cálculo ───────────────────────────────

export const recordDisplayMetaSchema = z
  .object({
    title: z.string().min(1),
    color: paletteColorIdSchema,
    note: z.string().optional(),
  })
  .strict()

export const displayPointSchema = z
  .object({
    timeMs: z.number().finite(),
    amountMg: z.number().finite().nonnegative(),
    clippedBelowLogEpsilon: z.boolean().optional(),
  })
  .strict()

export const displayWindowSchema = z
  .object({
    startMs: z.number().finite(),
    endMs: z.number().finite(),
  })
  .strict()

export const calculationWindowSchema = z
  .object({
    startMs: z.number().finite(),
    endMs: z.number().finite(),
  })
  .strict()

export const simulationDoseSchema = z
  .object({
    id: z.string().min(1),
    amountMg: z.number().finite().positive().max(SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX),
    timeMs: z.number().finite(),
  })
  .strict()

export const simulationInputSchema = z
  .object({
    halfLifeMs: z.number().finite().positive(),
    tmaxMs: z.number().finite().nonnegative().nullable(),
    doses: z.array(simulationDoseSchema).max(SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX),
    nowMs: z.number().finite(),
    analysisCurveSteps: z.number().int().positive().optional(),
  })
  .strict()

export const pkStateSchema = z
  .object({
    administeredMg: z.number().finite(),
    centralMg: z.number().finite(),
    depotMg: z.number().finite(),
    eliminatedMg: z.number().finite(),
    administeredCount: z.number().int().nonnegative(),
    plannedCount: z.number().int().nonnegative(),
    centralPercent: z.number().finite(),
    depotPercent: z.number().finite(),
    eliminatedPercent: z.number().finite(),
  })
  .strict()

export const simulationMetadataSchema = z
  .object({
    pkEngineVersion: z.string().min(1),
    kePerMs: z.number().finite().positive(),
    kaPerMs: z.number().finite().positive().nullable(),
    terminalHalfLifeMs: z.number().finite().positive(),
    horizonEndMs: z.number().finite(),
    analysisCurveSteps: z.number().int().positive(),
    contributionCutoffHalfLives: z.literal(44),
    contributionCutoffAgeMs: z.number().finite().positive(),
  })
  .strict()

export const pkWarningCodeSchema = z.enum([
  'FLIP_FLOP_ABSORPTION',
  'NEAR_DEGENERATE_RATES',
  'MILESTONE_NOT_REACHED',
  'EXTREME_PARAMETERS',
])

export const comparatorScenarioResultSnapshotSchema = z
  .object({
    scenarioId: z.string().min(1),
    scenarioSnapshot: scenarioSchema,
    simulationInput: simulationInputSchema,
    resultSnapshot: z
      .object({
        currentState: pkStateSchema,
        analysisCurve: z.array(
          z.object({ timeMs: z.number().finite(), amountMg: z.number().finite() }).strict(),
        ),
        peak: z.object({ timeMs: z.number().finite(), amountMg: z.number().finite() }).strict(),
        milestones: z.array(
          z
            .object({
              percentage: z.number().finite(),
              targetMg: z.number().finite(),
              timeMs: z.number().finite().nullable(),
            })
            .strict(),
        ),
        warnings: z.array(pkWarningCodeSchema),
        metadata: simulationMetadataSchema,
      })
      .strict(),
  })
  .strict()

export const chartSnapshotPointSchema = z
  .object({
    timeMs: z.number().finite(),
    value: z.number().finite(),
    valueKind: z.enum(['mg', 'normalized_ratio']),
    clippedBelowLogEpsilon: z.boolean().optional(),
  })
  .strict()

export const chartViewScenarioSnapshotSchema = z
  .object({
    scenarioId: z.string().min(1),
    label: z.string().min(1),
    color: paletteColorIdSchema,
    points: z.array(chartSnapshotPointSchema),
  })
  .strict()

export const chartViewSnapshotSchema = z
  .object({
    displayWindow: displayWindowSchema,
    calendarTimeZone: timeZoneIdSchema,
    scaleMode: z.enum(['absolute', 'normalized']),
    yAxisMode: z.enum(['linear', 'log']),
    displayPointsByScenario: z.array(chartViewScenarioSnapshotSchema),
  })
  .strict()

export const protocolComponentKeySchema = z
  .object({
    protocolId: z.string().min(1),
    componentId: z.string().min(1),
  })
  .strict()

export const protocolSimulationInputSnapshotSchema = z
  .object({
    key: protocolComponentKeySchema,
    input: simulationInputSchema,
  })
  .strict()

export const protocolAnalysisSeriesSnapshotSchema = z
  .object({
    key: protocolComponentKeySchema,
    label: z.string().min(1),
    color: paletteColorIdSchema,
    displayPoints: z.array(displayPointSchema),
    state: pkStateSchema,
    peak: z.object({ timeMs: z.number().finite(), amountMg: z.number().finite() }).strict(),
    milestones: z.array(
      z
        .object({
          percentage: z.number().finite(),
          targetMg: z.number().finite(),
          timeMs: z.number().finite().nullable(),
        })
        .strict(),
    ),
    warnings: z.array(pkWarningCodeSchema),
  })
  .strict()

export const protocolAnalysisSnapshotSchema = z
  .object({
    displayWindow: displayWindowSchema,
    calculationWindow: calculationWindowSchema,
    series: z.array(protocolAnalysisSeriesSnapshotSchema),
  })
  .strict()

export const protocolAnalysisVersionsSchema = z
  .object({
    pkEngineVersion: z.string().min(1),
    recurrenceEngineVersion: z.string().min(1),
    datasetVersion: z.number().int().positive(),
  })
  .strict()

// ── CalculationRecord Discriminated Union ────────────────────────

export const calculationRecordBaseSchema = z.object({
  id: z.string().min(1),
  createdAt: instantIsoSchema,
  display: recordDisplayMetaSchema,
})

export const pkCalculationRecordSchema = calculationRecordBaseSchema
  .extend({
    type: z.literal('pharmacokinetics'),
    versions: z
      .object({
        pkEngineVersion: z.string().min(1),
        recurrenceEngineVersion: z.string().min(1).optional(),
        datasetVersion: z.number().int().positive(),
      })
      .strict(),
    scenarios: z.array(comparatorScenarioResultSnapshotSchema).min(1),
    chartViewSnapshot: chartViewSnapshotSchema,
  })
  .strict()

export const reconCalculationRecordSchema = calculationRecordBaseSchema
  .extend({
    type: z.literal('reconstitution'),
    versions: z
      .object({
        reconstitutionEngineVersion: z.string().min(1),
        datasetVersion: z.number().int().positive(),
      })
      .strict(),
    input: reconstitutionInputSchema,
    resultSnapshot: reconstitutionResultSchema,
  })
  .strict()

export const protocolAnalysisCalculationRecordSchema = calculationRecordBaseSchema
  .extend({
    type: z.literal('protocol-analysis'),
    versions: protocolAnalysisVersionsSchema,
    timeZone: timeZoneIdSchema,
    snapshot: protocolAnalysisSnapshotSchema,
    simulationInputs: z.array(protocolSimulationInputSnapshotSchema),
    protocolsSnapshot: z.array(protocolSchema),
  })
  .strict()

export const calculationRecordSchema = z.discriminatedUnion('type', [
  pkCalculationRecordSchema,
  reconCalculationRecordSchema,
  protocolAnalysisCalculationRecordSchema,
])

// ── Export / FullBackup Bundles ──────────────────────────────────

export const engineVersionsSchema = z
  .object({
    pk: z.string().min(1),
    recurrence: z.string().min(1),
    reconstitution: z.string().min(1),
  })
  .strict()

export const backupCountsSchema = z
  .object({
    records: z.number().int().nonnegative(),
    recipes: z.number().int().nonnegative(),
    scenarios: z.number().int().nonnegative(),
    protocols: z.number().int().nonnegative(),
  })
  .strict()

export const configExportBundleSchema = z
  .object({
    bundleKind: z.literal('config'),
    schemaVersion: z.literal(1),
    exportedAt: instantIsoSchema,
    datasetVersion: z.number().int().positive(),
    engineVersions: engineVersionsSchema,
    payload: configPayloadSchema,
  })
  .strict()

export const fullBackupBundleSchema = z
  .object({
    bundleKind: z.literal('full-backup'),
    schemaVersion: z.literal(1),
    exportedAt: instantIsoSchema,
    datasetVersion: z.number().int().positive(),
    engineVersions: engineVersionsSchema,
    payload: configPayloadSchema,
    history: z.array(calculationRecordSchema).max(SAFETY_LIMITS.HISTORY_RECORDS_MAX),
    counts: backupCountsSchema,
  })
  .strict()

export const exportBundleSchema = z.discriminatedUnion('bundleKind', [
  configExportBundleSchema,
  fullBackupBundleSchema,
])
