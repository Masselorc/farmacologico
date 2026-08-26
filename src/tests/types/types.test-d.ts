import { z } from 'zod'
import {
  dataManagementErrorMessages,
  domainErrorMessages,
  pkWarningMessages,
  reconstitutionWarningMessages,
  recurrenceReasonMessages,
} from '../../app/i18n/pt-BR.messages'
import type { RecurrenceInvalidReason } from '../../domain/recurrence/validate'
import type { DataManagementErrorCode, DomainErrorCode } from '../../domain/shared/errors'
import type {
  BackupCounts,
  ConfigExportBundle,
  ConfigPayload,
  DisplayColor,
  Dose,
  DoseDraft,
  ExportBundle,
  FullBackupBundle,
  IsoWeekday,
  PkParametersSnapshot,
  PkWarningCode,
  ProfileOrigin,
  Protocol,
  ProtocolComponent,
  ProtocolComponentSource,
  ReconstitutionInput,
  ReconstitutionWarningCode,
  Recurrence,
  Schedule,
  Scenario,
  ScenarioSource,
  SelectedPkParameters,
  Syringe,
} from '../../domain/types'
import type { LimitsBounds } from '../../validation/bounds'
import {
  displayColorSchema,
  doseDraftSchema,
  doseSchema,
  pkParametersSnapshotSchema,
  protocolComponentSchema,
  protocolComponentSourceSchema,
  protocolSchema,
  reconstitutionInputSchema,
  recurrenceSchema,
  scheduleSchema,
  scenarioSchema,
  scenarioSourceSchema,
  selectedPkParametersSchema,
  syringeSchema,
} from '../../validation/index'

// Helpers estáticos de type-testing compile-time (§6, §24).
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T
type Extends<A, B> = A extends B ? true : false

// 1. Compatibilidade de Schemas Zod com Tipos de Domínio (infer ↔ domain type)
export type TestDose = Expect<Extends<z.infer<typeof doseSchema>, Dose>>
export type TestDoseDraft = Expect<Extends<z.infer<typeof doseDraftSchema>, DoseDraft>>
export type TestSelectedPk = Expect<Extends<z.infer<typeof selectedPkParametersSchema>, SelectedPkParameters>>
export type TestPkSnapshot = Expect<Extends<z.infer<typeof pkParametersSnapshotSchema>, PkParametersSnapshot>>
export type TestRecurrence = Expect<Extends<z.infer<typeof recurrenceSchema>, Recurrence>>
export type TestSchedule = Expect<Extends<z.infer<typeof scheduleSchema>, Schedule>>
export type TestScenarioSource = Expect<Extends<z.infer<typeof scenarioSourceSchema>, ScenarioSource>>
export type TestScenario = Expect<Extends<z.infer<typeof scenarioSchema>, Scenario>>
export type TestProtocolComponentSource = Expect<Extends<z.infer<typeof protocolComponentSourceSchema>, ProtocolComponentSource>>
export type TestProtocolComponent = Expect<Extends<z.infer<typeof protocolComponentSchema>, ProtocolComponent>>
export type TestProtocol = Expect<Extends<z.infer<typeof protocolSchema>, Protocol>>
export type TestDisplayColor = Expect<Extends<z.infer<typeof displayColorSchema>, DisplayColor>>
export type TestSyringe = Expect<Extends<z.infer<typeof syringeSchema>, Syringe>>
export type TestReconstitutionInput = Expect<Extends<z.infer<typeof reconstitutionInputSchema>, ReconstitutionInput>>

// 2. Compatibilidade Bidirecional das Entidades Centrais (Igualdade Exata)
export type TestExactSelectedPk = Expect<Equal<z.infer<typeof selectedPkParametersSchema>, SelectedPkParameters>>
export type TestExactScenario = Expect<Equal<z.infer<typeof scenarioSchema>, Scenario>>
export type TestExactScenarioSource = Expect<Equal<z.infer<typeof scenarioSourceSchema>, ScenarioSource>>
export type TestExactProtocolComponent = Expect<Equal<z.infer<typeof protocolComponentSchema>, ProtocolComponent>>
export type TestExactProtocolComponentSource = Expect<Equal<z.infer<typeof protocolComponentSourceSchema>, ProtocolComponentSource>>
export type TestExactProtocol = Expect<Equal<z.infer<typeof protocolSchema>, Protocol>>
export type TestExactDisplayColor = Expect<Equal<z.infer<typeof displayColorSchema>, DisplayColor>>
export type TestExactRecurrence = Expect<Equal<z.infer<typeof recurrenceSchema>, Recurrence>>
export type TestExactSchedule = Expect<Equal<z.infer<typeof scheduleSchema>, Schedule>>
export type TestExactDose = Expect<Equal<z.infer<typeof doseSchema>, Dose>>
export type TestExactDoseDraft = Expect<Equal<z.infer<typeof doseDraftSchema>, DoseDraft>>
export type TestExactSyringe = Expect<Equal<z.infer<typeof syringeSchema>, Syringe>>
export type TestExactReconstitutionInput = Expect<Equal<z.infer<typeof reconstitutionInputSchema>, ReconstitutionInput>>

// 3. Exaustividade de Chaves nos Catálogos de Mensagens pt-BR
export type TestDomainErrorCatalog = Expect<Equal<keyof typeof domainErrorMessages, DomainErrorCode>>
export type TestDataMgmtErrorCatalog = Expect<Equal<keyof typeof dataManagementErrorMessages, DataManagementErrorCode>>
export type TestPkWarningCatalog = Expect<Equal<keyof typeof pkWarningMessages, PkWarningCode>>
export type TestReconWarningCatalog = Expect<Equal<keyof typeof reconstitutionWarningMessages, ReconstitutionWarningCode>>
export type TestRecurrenceReasonCatalog = Expect<Equal<keyof typeof recurrenceReasonMessages, RecurrenceInvalidReason>>

// 4. Estrutura e integridade do LimitsBounds
export type TestBoundsType = Expect<Extends<LimitsBounds, {
  halfLife: { days: { min?: number; max?: number; step: number | 'any' }; ms: { min?: number; max?: number; step: number | 'any' } }
  doseMg: { min?: number; max?: number; step: number | 'any' }
  syringeCapacityUnits: { min?: number; max?: number; step: number | 'any' }
  caps: { scenariosMax: number; dosesPerScenarioMax: number; protocolsMax: number; weeksMax: number }
  bytes: { configPayloadBytesMax: number; configImportBytesMax: number; calculationRecordBytesMax: number }
}>>

// 5. Contratos de Provenance (ProfileOrigin §6) — Testes Positivos e Narrowing
export const testLegacyOrigin1: ProfileOrigin = { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' }
export const testLegacyOrigin2: ProfileOrigin = { kind: 'legacy_unattributed', reviewStatus: 'needs_review' }
export const testLegacyOrigin3: ProfileOrigin = { kind: 'legacy_unattributed', reviewStatus: 'reviewed' }
export const testLiteratureOrigin1: ProfileOrigin = { kind: 'literature', reviewStatus: 'needs_review', sourceIds: ['src-1'] }
export const testLiteratureOrigin2: ProfileOrigin = { kind: 'literature', reviewStatus: 'reviewed', sourceIds: ['src-1', 'src-2'] }
export const testUserDefinedOrigin: ProfileOrigin = { kind: 'user_defined', reviewStatus: 'not_applicable' }

export function testNarrowProfileOrigin(origin: ProfileOrigin): string {
  switch (origin.kind) {
    case 'legacy_unattributed':
      return `legacy:${origin.reviewStatus}`
    case 'literature':
      return `lit:${origin.reviewStatus}:${origin.sourceIds.join(',')}`
    case 'user_defined':
      return `user:${origin.reviewStatus}`
  }
}

// 6. Contratos de Export (ExportBundle §6) — Testes Positivos e Narrowing
export type TestExportBundleUnion = Expect<Equal<ExportBundle, ConfigExportBundle | FullBackupBundle>>

export function testNarrowExportBundle(bundle: ExportBundle): string {
  switch (bundle.bundleKind) {
    case 'config': {
      const p: ConfigPayload = bundle.payload
      return `config:${bundle.schemaVersion}:${p.scenarios.length}`
    }
    case 'full-backup': {
      const counts: BackupCounts = bundle.counts
      return `full-backup:${bundle.schemaVersion}:${counts.records}:${bundle.history.length}`
    }
  }
}

// 7. Rejeição de Shapes Inválidos Compile-Time via @ts-expect-error
// @ts-expect-error - 0 não é um IsoWeekday válido (apenas 1..7)
export const testInvalidWeekday: IsoWeekday = 0

// @ts-expect-error - weekdays deve ser IsoWeekday[], não string[]
export const testInvalidWeekly: Recurrence = { type: 'weekly', weekdays: ['domingo'], weeks: 4 }

// @ts-expect-error - single recurrence não aceita campo weeks
export const testInvalidSingle: Recurrence = { type: 'single', weeks: 4 }

// @ts-expect-error - Scenario sem source é inválido
export const testScenarioWithoutSource: Scenario = {
  id: 's1',
  name: 'Cenário',
  color: 'c1',
  displayUnit: 'mg',
  selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
  doses: [],
}

// @ts-expect-error - ProtocolComponent sem source é inválido
export const testProtocolCompWithoutSource: ProtocolComponent = {
  id: 'c1',
  label: 'C1',
  proportion: 1,
  selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
  pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
  displayColor: { paletteColor: 'blue' },
}

// @ts-expect-error - ProtocolComponent sem pkParametersSnapshot é inválido
export const testProtocolCompWithoutSnapshot: ProtocolComponent = {
  id: 'c1',
  label: 'C1',
  proportion: 1,
  source: { type: 'manual' },
  selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
  displayColor: { paletteColor: 'blue' },
}

// @ts-expect-error - ProtocolComponent sem displayColor é inválido
export const testProtocolCompWithoutColor: ProtocolComponent = {
  id: 'c1',
  label: 'C1',
  proportion: 1,
  source: { type: 'manual' },
  selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
  pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
}

// @ts-expect-error - DisplayColor como string é inválido
export const testDisplayColorString: DisplayColor = '#0055ff'

// @ts-expect-error - Protocol sem createdAt é inválido
export const testProtocolWithoutCreatedAt: Protocol = {
  id: 'p1',
  name: 'Protocolo',
  totalDoseMg: 100,
  schedule: { startDate: '2026-08-26', localTime: '08:00', timeZone: 'America/Sao_Paulo', recurrence: { type: 'single' } },
  components: [],
  updatedAt: '2026-08-26T12:00:00Z',
}

// @ts-expect-error - Protocol sem updatedAt é inválido
export const testProtocolWithoutUpdatedAt: Protocol = {
  id: 'p1',
  name: 'Protocolo',
  totalDoseMg: 100,
  schedule: { startDate: '2026-08-26', localTime: '08:00', timeZone: 'America/Sao_Paulo', recurrence: { type: 'single' } },
  components: [],
  createdAt: '2026-08-26T12:00:00Z',
}

// @ts-expect-error - user_defined com reviewStatus reviewed é inválido (apenas not_applicable)
export const testInvalidUserDefinedOrigin: ProfileOrigin = { kind: 'user_defined', reviewStatus: 'reviewed' }

// @ts-expect-error - legacy_unattributed com not_applicable é inválido
export const testInvalidLegacyOrigin: ProfileOrigin = { kind: 'legacy_unattributed', reviewStatus: 'not_applicable' }

// @ts-expect-error - literature sem sourceIds é inválido
export const testInvalidLiteratureMissingSources: ProfileOrigin = { kind: 'literature', reviewStatus: 'reviewed' }

// @ts-expect-error - literature com not_applicable é inválido
export const testInvalidLiteratureStatus: ProfileOrigin = { kind: 'literature', reviewStatus: 'not_applicable', sourceIds: ['s1'] }

// @ts-expect-error - ProfileOrigin com kind desconhecido é inválido
export const testInvalidOriginKind: ProfileOrigin = { kind: 'unknown_kind', reviewStatus: 'reviewed' }

// @ts-expect-error - ExportBundle com bundleKind desconhecido é inválido
export const testInvalidExportBundleKind: ExportBundle = { bundleKind: 'unknown_bundle', schemaVersion: 1, exportedAt: '2026-08-26T12:00:00Z', datasetVersion: 1, engineVersions: { pk: '1.0.0', recurrence: '1.0.0', reconstitution: '1.0.0' }, payload: {} as ConfigPayload }

// @ts-expect-error - ConfigExportBundle não aceita campo history (exclusivo de FullBackupBundle)
export const testInvalidConfigExportWithHistory: ConfigExportBundle = { bundleKind: 'config', schemaVersion: 1, exportedAt: '2026-08-26T12:00:00Z', datasetVersion: 1, engineVersions: { pk: '1.0.0', recurrence: '1.0.0', reconstitution: '1.0.0' }, payload: {} as ConfigPayload, history: [] }
