import type {
  ColorRemapEntry,
  InstantIso,
  PaletteColorId,
  PkParametersSnapshot,
  Protocol,
  Scenario,
  ScenarioSource,
  SelectedPkParameters,
  TimeZoneId,
} from '../domain/types'

export type LegacyMigrationSourceKey = 'hormoTrackerProtocols' | 'meiavida:v2:data'

export interface MigrationIssue {
  code: string
  sourceIndex?: number
  groupKey?: string
  discardedUnits: number
  requiresQuarantine: boolean
  message?: string
}

export interface MigrationPaletteEntry {
  id: PaletteColorId
  hex: string
}

export interface LegacyOfficialProfileMatch {
  substanceId: string
  profileId: string
  datasetVersion: number
}

export interface LegacyOfficialProfileResolver {
  resolve(input: {
    legacyName: string
    halfLifeMs: number
    tmaxMs: number | null
    compoundKey?: string
  }): LegacyOfficialProfileMatch[]
}

export interface LegacyScenarioLibraryResolver {
  resolve(input: {
    legacyName: string
    selectedPkParameters: SelectedPkParameters
    pkParametersSnapshot: PkParametersSnapshot
  }): LegacyOfficialProfileMatch[]
}

export type LegacyMigratedScenarioSource = Extract<ScenarioSource, { type: 'library' | 'manual' }>
export type LegacyMigratedScenario = Omit<Scenario, 'source'> & { source: LegacyMigratedScenarioSource }

export interface LegacyMigrationPreview<T extends Protocol | Scenario> {
  sourceKey: LegacyMigrationSourceKey
  assumedTimeZone: TimeZoneId
  ranAt: InstantIso
  entities: T[]
  importedCount: number
  discardedCount: number
  colorRemaps: ColorRemapEntry[]
  issues: MigrationIssue[]
  originalUtf8Bytes: number
}

export interface LegacyMigrationApplyResult {
  status: 'applied' | 'already_migrated' | 'nothing_to_apply' | 'failed'
  report: import('../domain/types').MigrationReport
  issues: MigrationIssue[]
  addedCount: number
  persisted: boolean
  markerPersisted: boolean
  error?: string
}

export interface LegacyMigrationAvailability {
  sourceKey: LegacyMigrationSourceKey
  available: boolean
  completed: boolean
}

export interface LegacyKeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
