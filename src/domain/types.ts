// Tipos de domínio necessários à E3 (subconjunto coerente com §6).
// Histórico/dataset/favoritos/export/storage/migrations pertencem a etapas posteriores.

import type { Duration, DurationRange, DurationValue, InstantIso, LocalDate, LocalTime, MassUnit, TimeZoneId } from './shared/types.datetime'

export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface SelectedPkParameters {
  halfLifeMs: number
  /** null = absorção instantânea. */
  tmaxMs: number | null
}

export interface Dose {
  id: string
  amountMg: number
  time: InstantIso
}

/** Cenário mínimo necessário ao assembly da E3; `source` completo chega na E10. */
export interface Scenario {
  id: string
  name: string
  color: string
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

export interface ProtocolComponent {
  id: string
  label: string
  proportion: number
  selectedPkParameters: SelectedPkParameters
}

export interface Protocol {
  id: string
  name: string
  totalDoseMg: number
  schedule: Schedule
  components: ProtocolComponent[]
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

// Reexportações de conveniência para consumidores dos motores.
export type { Duration, DurationRange, DurationValue }
