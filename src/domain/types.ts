// Tipos de domínio necessários à E3 (subconjunto coerente com §6).
// Histórico/dataset/favoritos/export/storage/migrations pertencem a etapas posteriores.

import type { Duration, DurationRange, DurationValue, InstantIso, LocalDate, LocalTime, MassUnit, TimeUnit, TimeZoneId } from './shared/types.datetime'

export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

import type { PaletteColorId } from './shared/colors'
export type { PaletteColorId }

export interface DisplayColor {
  paletteColor: PaletteColorId
  legacyOriginalHex?: string
}

// ── Origem/revisão (discriminada — combinações impossíveis são inválidas) (§6) ──
export type ProfileOrigin =
  | { kind: 'legacy_unattributed'; reviewStatus: 'legacy_unreviewed' | 'needs_review' | 'reviewed' }
  | { kind: 'literature'; reviewStatus: 'needs_review' | 'reviewed'; sourceIds: string[] }
  | { kind: 'user_defined'; reviewStatus: 'not_applicable' }


export interface SelectedPkParameters {
  halfLifeMs: number
  /** null = absorção instantânea. */
  tmaxMs: number | null
  selectionNote?: {
    range: {
      halfLife?: DurationRange
      tmaxRange?: DurationRange
    }
    chosenBy: 'user'
  }
}

export interface PkParametersSnapshot {
  halfLife: DurationValue
  tmax: DurationValue | null
  selectedFromRange?: { halfLife?: DurationRange; tmax?: DurationRange }
}

export interface Dose {
  id: string
  amountMg: number
  time: InstantIso
}

export interface DoseDraft {
  id: string
  amountMg: number | null
  localDate?: LocalDate
  localTime?: LocalTime
}

export type ScenarioSource =
  | {
      type: 'library'
      substanceId: string
      profileId: string
      datasetVersion: number
      pkParametersSnapshot: PkParametersSnapshot
    }
  | {
      type: 'custom_profile'
      customProfileId: string
      pkParametersSnapshot: PkParametersSnapshot
    }
  | {
      type: 'manual'
      pkParametersSnapshot?: PkParametersSnapshot
    }

/** Cenário de simulação (§6). */
export interface Scenario {
  id: string
  name: string
  color: PaletteColorId
  source: ScenarioSource
  displayUnit: MassUnit
  selectedPkParameters: SelectedPkParameters
  doses: Dose[]
}

export interface SimulationDose {
  id: string
  amountMg: number
  timeMs: number
}

export interface SimulationInput {
  halfLifeMs: number
  tmaxMs: number | null
  doses: SimulationDose[]
  nowMs: number
  /** default 1600 intervalos — independe da exibição. */
  analysisCurveSteps?: number
}

export interface SimulationMetadata {
  pkEngineVersion: string
  kePerMs: number
  kaPerMs: number | null
  terminalHalfLifeMs: number
  horizonEndMs: number
  analysisCurveSteps: number
  contributionCutoffHalfLives: 44
  contributionCutoffAgeMs: number
}

export type PkWarningCode =
  | 'FLIP_FLOP_ABSORPTION'
  | 'NEAR_DEGENERATE_RATES'
  | 'MILESTONE_NOT_REACHED'
  | 'EXTREME_PARAMETERS'

export interface PkState {
  administeredMg: number
  centralMg: number
  depotMg: number
  eliminatedMg: number
  administeredCount: number
  plannedCount: number
  centralPercent: number
  depotPercent: number
  eliminatedPercent: number
}

export interface SimulationOutput {
  currentState: PkState
  analysisCurve: Array<{ timeMs: number; amountMg: number }>
  peak: { timeMs: number; amountMg: number }
  milestones: Array<{ percentage: number; targetMg: number; timeMs: number | null }>
  administrations: Array<{ doseId: string; timeMs: number; amountMg: number }>
  warnings: PkWarningCode[]
  metadata: SimulationMetadata
}

export interface DisplayPoint {
  timeMs: number
  amountMg: number
  clippedBelowLogEpsilon?: boolean
}

export interface DisplayWindow {
  startMs: number
  endMs: number
}

export interface CalculationWindow {
  startMs: number
  endMs: number
}

export type Recurrence =
  | { type: 'single' }
  | { type: 'weekly'; weekdays: IsoWeekday[]; weeks: number }

export interface Schedule {
  startDate: LocalDate
  localTime: LocalTime
  timeZone: TimeZoneId
  recurrence: Recurrence
}

export interface Occurrence {
  instantMs: number
  scheduleLocalDate: LocalDate
}

export type ProtocolComponentSource =
  | { type: 'library'; substanceId: string; profileId: string; datasetVersion: number }
  | { type: 'custom_profile'; customProfileId: string }
  | { type: 'manual' }

export interface ProtocolComponent {
  id: string
  label: string
  proportion: number
  source: ProtocolComponentSource
  selectedPkParameters: SelectedPkParameters
  pkParametersSnapshot: PkParametersSnapshot
  displayColor: DisplayColor
}

export interface Protocol {
  id: string
  name: string
  totalDoseMg: number
  schedule: Schedule
  components: ProtocolComponent[]
  createdAt: InstantIso
  updatedAt: InstantIso
}

export interface Syringe {
  family: 'U-100'
  capacityUnits: number
  unitsPerMl: 100
  /** finite>0; aceita decimais (ex.: 0,5). */
  graduationUnits: number
}

export interface ReconstitutionInput {
  vialMassMg: number
  diluentVolumeMl: number
  desiredDoseMcg: number
  syringe: Syringe
  label?: string
}

export type ReconstitutionWarningCode =
  | 'CAPACITY_EXCEEDED'
  | 'LOW_SYRINGE_PRECISION'
  | 'THEORETICAL_YIELD'

export interface ReconstitutionResult {
  concentrationMcgPerMl: number
  doseVolumeMl: number
  syringeUnits: number
  theoreticalMaxDoses: number
  capacityExceeded: boolean
  warnings: ReconstitutionWarningCode[]
  metadata: { reconstitutionEngineVersion: string }
}

export type { Duration, DurationRange, DurationValue, InstantIso, LocalDate, LocalTime, MassUnit, TimeUnit, TimeZoneId }
export type { DataManagementError, DataManagementErrorCode, InternalStorageError, StorageOperationError } from './shared/errors'
export type {
  AdministrationRoute,
  AppSettings,
  BackupCounts,

  CalculationRecord,
  ColorRemapEntry,
  CalculationRecordBase,
  ChartScaleMode,
  ChartSnapshotPoint,
  ChartSnapshotValueKind,
  ChartViewScenarioSnapshot,
  ChartViewSnapshot,
  ChartYAxisMode,
  ComparatorScenarioResultSnapshot,
  ConfigExportBundle,
  ConfigImportPreview,
  ConfigMutationResult,
  ConfigPayload,
  CustomProfile,
  CustomProfileOwner,
  CustomSubstance,
  EngineVersions,
  ExportBundle,
  ExportBundleBase,
  Favorites,
  FullBackupBundle,
  FullBackupImportPreview,
  ImportActionKind,
  ImportPreview,
  MigrationReport,
  PersistedStateV1,
  ProtocolAnalysisSeriesSnapshot,
  ProtocolAnalysisSnapshot,
  ProtocolAnalysisVersions,
  ProtocolComponentKey,
  ProtocolSimulationInputSnapshot,
  QuarantineItem,
  QuarantineSource,
  ReconstitutionRecipe,
  RecordDisplayMeta,
  StorageMode,
  StoredHistoryEntry,
  SubstanceCategory,
  SubstanceRef,
  TmaxSpecification,
} from './data-management/types'
