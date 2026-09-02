import { analyze } from '../../../domain/pk/analysis'
import { sampleForDisplay } from '../../../domain/pk/sampling'
import { assembleScenarioInputs, selectRelevantScenarioDoses } from '../../../domain/simulation/assemble'
import { deriveCalculationWindow } from '../../../domain/simulation/windows'
import { domainError, isDomainError, type DomainError } from '../../../domain/shared/errors'
import type {
  CalculationWindow,
  ChartScaleMode,
  ChartSnapshotPoint,
  ChartYAxisMode,
  DisplayPoint,
  DisplayWindow,
  Scenario,
  SimulationInput,
  SimulationOutput,
} from '../../../domain/types'
import { createChartSnapshotPoints } from './chartView'
import { derivePhaseHint, type PhaseHint } from './phaseHint'

export interface ComparatorAnalyzedScenario {
  scenario: Scenario
  calculationWindow: CalculationWindow
  simulationInput: SimulationInput
  result: SimulationOutput
  displayPoints: DisplayPoint[]
  snapshotPoints: ChartSnapshotPoint[]
  phaseHint: PhaseHint
}

export interface ScenarioAnalysisError {
  scenario: Scenario
  error: DomainError
}

export type ScenarioAnalysisResult =
  | { status: 'success'; data: ComparatorAnalyzedScenario }
  | { status: 'no_contributing_doses'; scenario: Scenario; calculationWindow: CalculationWindow }
  | { status: 'error'; scenario: Scenario; error: DomainError }

/**
 * Executa o pipeline científico por cenário individual (§7, §15, E9):
 * DisplayWindow → deriveCalculationWindow → selectRelevantScenarioDoses → assembleScenarioInputs → analyze → sampleForDisplay.
 */
export function analyzeScenario(
  scenario: Scenario,
  displayWindow: DisplayWindow,
  nowMs: number,
  scaleMode: ChartScaleMode,
  yAxisMode: ChartYAxisMode,
): ScenarioAnalysisResult {
  try {
    const calculationWindow = deriveCalculationWindow(displayWindow, [scenario.selectedPkParameters])
    const relevantDoses = selectRelevantScenarioDoses(scenario.doses, calculationWindow)

    if (relevantDoses.length === 0) {
      return {
        status: 'no_contributing_doses',
        scenario,
        calculationWindow,
      }
    }

    const simulationInput = assembleScenarioInputs(scenario, nowMs, relevantDoses)
    const result = analyze(simulationInput)
    const displayPoints = sampleForDisplay(result.analysisCurve, { displayWindow })
    const snapshotPoints = createChartSnapshotPoints({
      displayPoints,
      result,
      scaleMode,
      yAxisMode,
    })
    const phaseHint = derivePhaseHint(relevantDoses, scenario.selectedPkParameters.tmaxMs, nowMs)

    return {
      status: 'success',
      data: {
        scenario,
        calculationWindow,
        simulationInput,
        result,
        displayPoints,
        snapshotPoints,
        phaseHint,
      },
    }
  } catch (err) {
    const domainErr: DomainError = isDomainError(err)
      ? err
      : domainError('NUMERIC_FAILURE', {
          message: err instanceof Error ? err.message : String(err),
        })

    return {
      status: 'error',
      scenario,
      error: domainErr,
    }
  }
}
