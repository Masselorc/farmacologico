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
  CalculationRecord,
  CalculationRecordBase,
  ChartScaleMode,
  ChartSnapshotPoint,
  ChartSnapshotValueKind,
  ChartViewScenarioSnapshot,
  ChartViewSnapshot,
  ChartYAxisMode,
  ComparatorScenarioResultSnapshot,
  ConfigExportBundle,
  ConfigPayload,
  DisplayColor,
  DisplayPoint,
  DisplayWindow,
  Dose,
  DoseDraft,
  ExportBundle,
  FullBackupBundle,
  IsoWeekday,
  PkParametersSnapshot,
  PkWarningCode,
  ProfileOrigin,
  Protocol,
  ProtocolAnalysisSeriesSnapshot,
  ProtocolAnalysisSnapshot,
  ProtocolAnalysisVersions,
  ProtocolComponent,
  ProtocolComponentKey,
  ProtocolComponentSource,
  ProtocolSimulationInputSnapshot,
  RecordDisplayMeta,
  ReconstitutionInput,
  ReconstitutionResult,
  ReconstitutionWarningCode,
  Recurrence,
  Schedule,
  Scenario,
  ScenarioSource,
  SelectedPkParameters,
  SimulationInput,
  SimulationOutput,
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

// 7. Compatibilidade dos Tipos e Snapshots de Histórico (§6)
export type TestCalculationRecordBase = Expect<Extends<CalculationRecordBase, { id: string; createdAt: string; display: RecordDisplayMeta }>>
export type TestRecordDisplayMeta = Expect<Extends<RecordDisplayMeta, { title: string; color: string; note?: string }>>
export type TestDisplayPoint = Expect<Extends<DisplayPoint, { timeMs: number; amountMg: number; clippedBelowLogEpsilon?: boolean }>>
export type TestDisplayWindow = Expect<Extends<DisplayWindow, { startMs: number; endMs: number }>>
export type TestChartScaleMode = Expect<Equal<ChartScaleMode, 'absolute' | 'normalized'>>
export type TestChartYAxisMode = Expect<Equal<ChartYAxisMode, 'linear' | 'log'>>
export type TestChartSnapshotValueKind = Expect<Equal<ChartSnapshotValueKind, 'mg' | 'normalized_ratio'>>
export type TestChartSnapshotPoint = Expect<Extends<ChartSnapshotPoint, { timeMs: number; value: number; valueKind: ChartSnapshotValueKind }>>
export type TestChartViewScenarioSnapshot = Expect<Extends<ChartViewScenarioSnapshot, { scenarioId: string; label: string; color: string; points: ChartSnapshotPoint[] }>>
export type TestProtocolAnalysisSeriesSnapshot = Expect<Extends<ProtocolAnalysisSeriesSnapshot, { key: ProtocolComponentKey; label: string; color: string; displayPoints: DisplayPoint[] }>>
export type TestProtocolAnalysisVersions = Expect<Extends<ProtocolAnalysisVersions, { pkEngineVersion: string; recurrenceEngineVersion: string; datasetVersion: number }>>

// 8. Contratos de Histórico (CalculationRecord §6) — Fixtures Positivas e Narrowing
export const testValidPkRecord: CalculationRecord = {
  id: 'pk-rec-1',
  createdAt: '2026-08-27T12:00:00Z',
  display: { title: 'Simulação Cipionato', color: 'blue-500', note: 'Teste PK' },
  type: 'pharmacokinetics',
  versions: { pkEngineVersion: '1.0.0', recurrenceEngineVersion: '1.0.0', datasetVersion: 1 },
  scenarios: [
    {
      scenarioId: 's1',
      scenarioSnapshot: {} as Scenario,
      simulationInput: {} as SimulationInput,
      resultSnapshot: {} as Pick<
        SimulationOutput,
        'currentState' | 'analysisCurve' | 'peak' | 'milestones' | 'warnings' | 'metadata'
      >,
    },
  ],
  chartViewSnapshot: {
    displayWindow: { startMs: 0, endMs: 86400000 },
    calendarTimeZone: 'America/Sao_Paulo',
    scaleMode: 'absolute',
    yAxisMode: 'linear',
    displayPointsByScenario: [
      {
        scenarioId: 's1',
        label: 'Cipionato',
        color: 'blue-500',
        points: [{ timeMs: 0, value: 10, valueKind: 'mg' }],
      },
    ],
  },
}

export const testValidReconRecord: CalculationRecord = {
  id: 'recon-rec-1',
  createdAt: '2026-08-27T12:00:00Z',
  display: { title: 'Reconstituição HCG', color: 'green-500' },
  type: 'reconstitution',
  versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
  input: {} as ReconstitutionInput,
  resultSnapshot: {} as ReconstitutionResult,
}

export const testValidProtocolRecord: CalculationRecord = {
  id: 'proto-rec-1',
  createdAt: '2026-08-27T12:00:00Z',
  display: { title: 'Protocolo TRT', color: 'purple-500' },
  type: 'protocol-analysis',
  versions: { pkEngineVersion: '1.0.0', recurrenceEngineVersion: '1.0.0', datasetVersion: 1 },
  timeZone: 'America/Sao_Paulo',
  snapshot: {
    displayWindow: { startMs: 0, endMs: 86400000 },
    calculationWindow: { startMs: 0, endMs: 86400000 },
    series: [
      {
        key: { protocolId: 'p1', componentId: 'c1' },
        label: 'Enantato',
        color: 'purple-500',
        displayPoints: [{ timeMs: 0, amountMg: 100 }],
        state: {} as SimulationOutput['currentState'],
        peak: { timeMs: 0, amountMg: 100 },
        milestones: [],
        warnings: [],
      },
    ],
  },
  simulationInputs: [
    {
      key: { protocolId: 'p1', componentId: 'c1' },
      input: {} as SimulationInput,
    },
  ],
  protocolsSnapshot: [{} as Protocol],
}

export const testValidFullBackup: FullBackupBundle = {
  bundleKind: 'full-backup',
  schemaVersion: 1,
  exportedAt: '2026-08-27T12:00:00Z',
  datasetVersion: 1,
  engineVersions: { pk: '1.0.0', recurrence: '1.0.0', reconstitution: '1.0.0' },
  payload: {} as ConfigPayload,
  counts: { records: 3, recipes: 1, scenarios: 2, protocols: 1 },
  history: [testValidPkRecord, testValidReconRecord, testValidProtocolRecord],
}

export function narrowCalculationRecord(record: CalculationRecord): string {
  switch (record.type) {
    case 'pharmacokinetics': {
      const s: ComparatorScenarioResultSnapshot[] = record.scenarios
      const c: ChartViewSnapshot = record.chartViewSnapshot
      return `pk:${s.length}:${c.scaleMode}:${c.calendarTimeZone}`
    }
    case 'reconstitution': {
      const i: ReconstitutionInput = record.input
      const r: ReconstitutionResult = record.resultSnapshot
      return `recon:${i.vialMassMg}:${r.syringeUnits}`
    }
    case 'protocol-analysis': {
      const snap: ProtocolAnalysisSnapshot = record.snapshot
      const inputs: ProtocolSimulationInputSnapshot[] = record.simulationInputs
      const protos: Protocol[] = record.protocolsSnapshot
      return `proto:${snap.series.length}:${inputs.length}:${protos.length}:${record.timeZone}`
    }
  }
}

// 8. Rejeição de Shapes Inválidos Compile-Time via @ts-expect-error
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

// 9. Rejeição de CalculationRecord Inválido Compile-Time via @ts-expect-error
// @ts-expect-error - CalculationRecord sem display é inválido
export const testInvalidCalcRecordNoDisplay: CalculationRecord = { id: 'r1', createdAt: '2026-08-27T12:00:00Z', type: 'pharmacokinetics', versions: { pkEngineVersion: '1.0.0', datasetVersion: 1 }, scenarios: [], chartViewSnapshot: {} as ChartViewSnapshot }

// @ts-expect-error - pharmacokinetics incompleto (sem versions, scenarios, chartViewSnapshot) é inválido
export const testInvalidPkIncomplete: CalculationRecord = { id: 'r1', createdAt: '2026-08-27T12:00:00Z', display: { title: 'PK', color: 'blue' }, type: 'pharmacokinetics' }

// @ts-expect-error - pharmacokinetics sem versions é inválido
export const testInvalidPkNoVersions: CalculationRecord = { id: 'r1', createdAt: '2026-08-27T12:00:00Z', display: { title: 'PK', color: 'blue' }, type: 'pharmacokinetics', scenarios: [], chartViewSnapshot: {} as ChartViewSnapshot }

// @ts-expect-error - pharmacokinetics sem scenarios é inválido
export const testInvalidPkNoScenarios: CalculationRecord = { id: 'r1', createdAt: '2026-08-27T12:00:00Z', display: { title: 'PK', color: 'blue' }, type: 'pharmacokinetics', versions: { pkEngineVersion: '1.0.0', datasetVersion: 1 }, chartViewSnapshot: {} as ChartViewSnapshot }

// @ts-expect-error - pharmacokinetics sem chartViewSnapshot é inválido
export const testInvalidPkNoChartView: CalculationRecord = { id: 'r1', createdAt: '2026-08-27T12:00:00Z', display: { title: 'PK', color: 'blue' }, type: 'pharmacokinetics', versions: { pkEngineVersion: '1.0.0', datasetVersion: 1 }, scenarios: [] }

// @ts-expect-error - reconstitution sem versions é inválido
export const testInvalidReconNoVersions: CalculationRecord = { id: 'r2', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Recon', color: 'green' }, type: 'reconstitution', input: {} as ReconstitutionInput, resultSnapshot: {} as ReconstitutionResult }

// @ts-expect-error - reconstitution sem input é inválido
export const testInvalidReconNoInput: CalculationRecord = { id: 'r2', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Recon', color: 'green' }, type: 'reconstitution', versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 }, resultSnapshot: {} as ReconstitutionResult }

// @ts-expect-error - reconstitution sem resultSnapshot é inválido
export const testInvalidReconNoResult: CalculationRecord = { id: 'r2', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Recon', color: 'green' }, type: 'reconstitution', versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 }, input: {} as ReconstitutionInput }

// @ts-expect-error - protocol-analysis sem versions é inválido
export const testInvalidProtoNoVersions: CalculationRecord = { id: 'r3', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Proto', color: 'purple' }, type: 'protocol-analysis', timeZone: 'America/Sao_Paulo', snapshot: {} as ProtocolAnalysisSnapshot, simulationInputs: [], protocolsSnapshot: [] }

// @ts-expect-error - protocol-analysis sem timeZone é inválido
export const testInvalidProtoNoTimeZone: CalculationRecord = { id: 'r3', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Proto', color: 'purple' }, type: 'protocol-analysis', versions: { pkEngineVersion: '1.0.0', recurrenceEngineVersion: '1.0.0', datasetVersion: 1 }, snapshot: {} as ProtocolAnalysisSnapshot, simulationInputs: [], protocolsSnapshot: [] }

// @ts-expect-error - protocol-analysis sem snapshot é inválido
export const testInvalidProtoNoSnapshot: CalculationRecord = { id: 'r3', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Proto', color: 'purple' }, type: 'protocol-analysis', versions: { pkEngineVersion: '1.0.0', recurrenceEngineVersion: '1.0.0', datasetVersion: 1 }, timeZone: 'America/Sao_Paulo', simulationInputs: [], protocolsSnapshot: [] }

// @ts-expect-error - protocol-analysis sem simulationInputs é inválido
export const testInvalidProtoNoInputs: CalculationRecord = { id: 'r3', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Proto', color: 'purple' }, type: 'protocol-analysis', versions: { pkEngineVersion: '1.0.0', recurrenceEngineVersion: '1.0.0', datasetVersion: 1 }, timeZone: 'America/Sao_Paulo', snapshot: {} as ProtocolAnalysisSnapshot, protocolsSnapshot: [] }

// @ts-expect-error - protocol-analysis sem protocolsSnapshot é inválido
export const testInvalidProtoNoProtos: CalculationRecord = { id: 'r3', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Proto', color: 'purple' }, type: 'protocol-analysis', versions: { pkEngineVersion: '1.0.0', recurrenceEngineVersion: '1.0.0', datasetVersion: 1 }, timeZone: 'America/Sao_Paulo', snapshot: {} as ProtocolAnalysisSnapshot, simulationInputs: [] }

// @ts-expect-error - reconstitution não aceita scenarios (campo cruzado)
export const testInvalidReconWithScenarios: CalculationRecord = { id: 'r2', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Recon', color: 'green' }, type: 'reconstitution', versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 }, input: {} as ReconstitutionInput, resultSnapshot: {} as ReconstitutionResult, scenarios: [] }

// @ts-expect-error - protocol-analysis não aceita chartViewSnapshot (campo cruzado)
export const testInvalidProtoWithChartView: CalculationRecord = { id: 'r3', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Proto', color: 'purple' }, type: 'protocol-analysis', versions: { pkEngineVersion: '1.0.0', recurrenceEngineVersion: '1.0.0', datasetVersion: 1 }, timeZone: 'America/Sao_Paulo', snapshot: {} as ProtocolAnalysisSnapshot, simulationInputs: [], protocolsSnapshot: [], chartViewSnapshot: {} as ChartViewSnapshot }

// @ts-expect-error - FullBackupBundle rejeita histórico com registro pharmacokinetics incompleto
export const testInvalidFullBackupIncompleteRecord: FullBackupBundle = { bundleKind: 'full-backup', schemaVersion: 1, exportedAt: '2026-08-27T12:00:00Z', datasetVersion: 1, engineVersions: { pk: '1.0.0', recurrence: '1.0.0', reconstitution: '1.0.0' }, payload: {} as ConfigPayload, counts: { records: 1, recipes: 0, scenarios: 0, protocols: 0 }, history: [{ id: 'x', createdAt: '2026-08-27T12:00:00Z', display: { title: 'Incompleto', color: 'red' }, type: 'pharmacokinetics' }] }

// @ts-expect-error - ChartViewSnapshot sem calendarTimeZone é inválido
export const testInvalidChartViewNoTz: ChartViewSnapshot = { displayWindow: { startMs: 0, endMs: 1000 }, scaleMode: 'absolute', yAxisMode: 'linear', displayPointsByScenario: [] }

// @ts-expect-error - ProtocolComponentKey sem protocolId é inválido
export const testInvalidCompKeyNoProto: ProtocolComponentKey = { componentId: 'c1' }

// @ts-expect-error - ProtocolComponentKey sem componentId é inválido
export const testInvalidCompKeyNoComp: ProtocolComponentKey = { protocolId: 'p1' }
