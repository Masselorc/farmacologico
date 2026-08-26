import { z } from 'zod'
import type {
  dataManagementErrorMessages,
  domainErrorMessages,
  pkWarningMessages,
  reconstitutionWarningMessages,
  recurrenceReasonMessages,
} from '../../app/i18n/pt-BR.errors'
import type { RecurrenceInvalidReason } from '../../domain/recurrence/validate'
import type { DataManagementErrorCode, DomainErrorCode } from '../../domain/shared/errors'
import type {
  Dose,
  DoseDraft,
  IsoWeekday,
  PkParametersSnapshot,
  PkWarningCode,
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
export type TestSyringe = Expect<Extends<z.infer<typeof syringeSchema>, Syringe>>
export type TestReconstitutionInput = Expect<Extends<z.infer<typeof reconstitutionInputSchema>, ReconstitutionInput>>

// 2. Compatibilidade Bidirecional das Entidades Centrais
export type TestExactSelectedPk = Expect<Equal<z.infer<typeof selectedPkParametersSchema>, SelectedPkParameters>>
export type TestExactRecurrence = Expect<Equal<z.infer<typeof recurrenceSchema>, Recurrence>>
export type TestExactSchedule = Expect<Equal<z.infer<typeof scheduleSchema>, Schedule>>
export type TestExactDose = Expect<Equal<z.infer<typeof doseSchema>, Dose>>
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
  halfLife: { days: { min: number; max: number; step: number | 'any' }; ms: { min: number; max: number; step: number | 'any' } }
  doseMg: { min: number; max: number; step: number | 'any' }
  caps: { scenariosMax: number; dosesPerScenarioMax: number; protocolsMax: number; weeksMax: number }
  bytes: { configPayloadBytesMax: number; configImportBytesMax: number; calculationRecordBytesMax: number }
}>>

// 5. Rejeição de Shapes Inválidos Compile-Time via @ts-expect-error
// @ts-expect-error - 0 não é um IsoWeekday válido (apenas 1..7)
export const testInvalidWeekday: IsoWeekday = 0

// @ts-expect-error - weekdays deve ser IsoWeekday[], não string[]
export const testInvalidWeekly: Recurrence = { type: 'weekly', weekdays: ['domingo'], weeks: 4 }

// @ts-expect-error - single recurrence não aceita campo weeks
export const testInvalidSingle: Recurrence = { type: 'single', weeks: 4 }
