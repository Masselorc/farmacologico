// Contratos de tipos de exportação, backup, histórico e dados de persistência (§6, §11, §12).
// E5 declara exclusivamente contratos de tipo compiláveis; implementação pertence à E6/E12.

import type { Duration, DurationRange, DurationValue, InstantIso, TimeZoneId } from '../shared/types.datetime'
import type {
  CalculationWindow,
  DisplayPoint,
  DisplayWindow,
  PaletteColorId,
  PkWarningCode,
  Protocol,
  ReconstitutionInput,
  ReconstitutionResult,
  Scenario,
  SimulationInput,
  SimulationOutput,
} from '../types'

export interface EngineVersions {
  pk: string
  recurrence: string
  reconstitution: string
}

export interface ExportBundleBase {
  schemaVersion: 1
  exportedAt: InstantIso
  datasetVersion: number
  engineVersions: EngineVersions
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  calendarTimeZone: TimeZoneId
  graduationWarnThreshold?: number
}

export type SubstanceRef =
  | { type: 'official'; substanceId: string; datasetVersion: number }
  | { type: 'custom'; substanceId: string }

export interface Favorites {
  substances: SubstanceRef[]
  recipeIds: string[]
}

export type SubstanceCategory = 'peptide' | 'steroid' | 'steroid_ester' | 'hormone' | 'other'
export type AdministrationRoute = 'intramuscular' | 'subcutaneous' | 'sublingual' | 'oral' | 'transdermal' | 'unknown'

export type TmaxSpecification =
  | { kind: 'unknown' }
  | { kind: 'instant' }
  | { kind: 'value'; value: DurationValue }
  | { kind: 'range'; range: DurationRange }

export type CustomProfileOwner =
  | { type: 'official'; substanceId: string }
  | { type: 'custom'; substanceId: string }

export interface CustomProfile {
  id: string
  owner: CustomProfileOwner
  route: AdministrationRoute
  formulation?: string
  ester?: string
  halfLife: Duration
  tmaxSpec: TmaxSpecification
  bioavailability?: number | { min: number; max: number }
  populationContext?: string
  origin: { kind: 'user_defined'; reviewStatus: 'not_applicable' }
  createdAt: InstantIso
  updatedAt: InstantIso
}

export interface CustomSubstance {
  id: string
  slug: string
  name: string
  aliases: string[]
  category: SubstanceCategory
  tags: string[]
  createdAt: InstantIso
  updatedAt: InstantIso
}

export interface ReconstitutionRecipe {
  id: string
  name: string
  input: ReconstitutionInput
  createdAt: InstantIso
  updatedAt: InstantIso
}

export interface ConfigPayload {
  settings: AppSettings
  favorites: Favorites
  customSubstances: CustomSubstance[]
  customProfiles: CustomProfile[]
  recipes: ReconstitutionRecipe[]
  scenarios: Scenario[]
  protocols: Protocol[]
}

export interface ConfigExportBundle extends ExportBundleBase {
  bundleKind: 'config'
  payload: ConfigPayload
}

export interface BackupCounts {
  records: number
  recipes: number
  scenarios: number
  protocols: number
}

// ── Histórico / Snapshots (§6) ──────────────────────────────────

export interface RecordDisplayMeta {
  title: string
  color: PaletteColorId
  note?: string
}

export interface CalculationRecordBase {
  id: string
  createdAt: InstantIso
  display: RecordDisplayMeta
}

export interface ComparatorScenarioResultSnapshot {
  scenarioId: string
  scenarioSnapshot: Scenario
  simulationInput: SimulationInput
  resultSnapshot: Pick<
    SimulationOutput,
    'currentState' | 'analysisCurve' | 'peak' | 'milestones' | 'warnings' | 'metadata'
  >
}

export type ChartScaleMode = 'absolute' | 'normalized'

export type ChartYAxisMode = 'linear' | 'log'

export type ChartSnapshotValueKind = 'mg' | 'normalized_ratio'

export interface ChartSnapshotPoint {
  timeMs: number
  value: number
  valueKind: ChartSnapshotValueKind
  clippedBelowLogEpsilon?: boolean
}

export interface ChartViewScenarioSnapshot {
  scenarioId: string
  label: string
  color: PaletteColorId
  points: ChartSnapshotPoint[]
}

export interface ChartViewSnapshot {
  displayWindow: DisplayWindow
  calendarTimeZone: TimeZoneId
  scaleMode: ChartScaleMode
  yAxisMode: ChartYAxisMode
  displayPointsByScenario: ChartViewScenarioSnapshot[]
}

export interface ProtocolComponentKey {
  protocolId: string
  componentId: string
}

export interface ProtocolSimulationInputSnapshot {
  key: ProtocolComponentKey
  input: SimulationInput
}

export interface ProtocolAnalysisSeriesSnapshot {
  key: ProtocolComponentKey
  label: string
  color: PaletteColorId
  displayPoints: DisplayPoint[]
  state: SimulationOutput['currentState']
  peak: SimulationOutput['peak']
  milestones: SimulationOutput['milestones']
  warnings: PkWarningCode[]
}

export interface ProtocolAnalysisSnapshot {
  displayWindow: DisplayWindow
  calculationWindow: CalculationWindow
  series: ProtocolAnalysisSeriesSnapshot[]
}

export interface ProtocolAnalysisVersions {
  pkEngineVersion: string
  recurrenceEngineVersion: string
  datasetVersion: number
}

export type CalculationRecord = CalculationRecordBase & (
  | {
      type: 'pharmacokinetics'
      versions: {
        pkEngineVersion: string
        recurrenceEngineVersion?: string
        datasetVersion: number
      }
      scenarios: ComparatorScenarioResultSnapshot[]
      chartViewSnapshot: ChartViewSnapshot
    }
  | {
      type: 'reconstitution'
      versions: {
        reconstitutionEngineVersion: string
        datasetVersion: number
      }
      input: ReconstitutionInput
      resultSnapshot: ReconstitutionResult
    }
  | {
      type: 'protocol-analysis'
      versions: ProtocolAnalysisVersions
      timeZone: TimeZoneId
      snapshot: ProtocolAnalysisSnapshot
      simulationInputs: ProtocolSimulationInputSnapshot[]
      protocolsSnapshot: Protocol[]
    }
)

export interface PersistedStateV1 {
  schemaVersion: 1
  settings: AppSettings
  favorites: Favorites
  customSubstances: CustomSubstance[]
  customProfiles: CustomProfile[]
  recipes: ReconstitutionRecipe[]
  scenarios: Scenario[]
  protocols: Protocol[]
}

// ── Quarentena compacta (store separado; não integra ConfigPayload/FullBackup) ──
export type QuarantineSource =
  | 'idb_corruption'
  | 'config_import'
  | 'full_backup_import'
  | 'legacy_migration'

export interface QuarantineItem {
  id: string
  createdAt: InstantIso
  source: QuarantineSource
  errorCode: string
  originalUtf8Bytes: number
  rawExcerptUtf8?: string
  truncated: boolean
}

// ── Tipos de Importação e Previews (§11) ──────────────────────────
export type ImportActionKind = 'config' | 'full-backup'

export interface ConfigImportPreview {
  actionKind: 'config'
  bundleKind: 'config'
  schemaVersion: 1
  datasetVersion: number
  exportedAt: InstantIso
  engineVersions: EngineVersions
  counts: {
    scenarios: number
    protocols: number
    recipes: number
    customSubstances: number
    customProfiles: number
  }
  warnings: string[]
  payload: ConfigPayload
}

export interface FullBackupImportPreview {
  actionKind: 'full-backup'
  bundleKind: 'full-backup'
  schemaVersion: 1
  datasetVersion: number
  exportedAt: InstantIso
  engineVersions: EngineVersions
  counts: BackupCounts
  historyRecordsCount: number
  warnings: string[]
  bundle: FullBackupBundle
}

export type ImportPreview = ConfigImportPreview | FullBackupImportPreview

export interface FullBackupBundle extends ExportBundleBase {
  bundleKind: 'full-backup'
  payload: ConfigPayload
  history: CalculationRecord[]
  counts: BackupCounts
}

export type ExportBundle = ConfigExportBundle | FullBackupBundle
