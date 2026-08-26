// Contratos de tipos de exportação, backup e dados de persistência (§6, §11).
// E5 declara exclusivamente contratos de tipo compiláveis; implementação pertence à E6.

import type { Duration, DurationRange, DurationValue, InstantIso, TimeZoneId } from '../shared/types.datetime'
import type { Protocol, ReconstitutionInput, Scenario } from '../types'

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

export interface CalculationRecordBase {
  id: string
  createdAt: InstantIso
}

export type CalculationRecord = CalculationRecordBase & {
  type: 'pharmacokinetics' | 'reconstitution' | 'protocol-analysis'
  [key: string]: unknown
}

export interface FullBackupBundle extends ExportBundleBase {
  bundleKind: 'full-backup'
  payload: ConfigPayload
  history: CalculationRecord[]
  counts: BackupCounts
}

export type ExportBundle = ConfigExportBundle | FullBackupBundle
