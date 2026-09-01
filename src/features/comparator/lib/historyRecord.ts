import { CURRENT_DATASET_VERSION } from '../../../domain/version'
import type {
  CalculationRecord,
  ChartScaleMode,
  ChartYAxisMode,
  DisplayWindow,
  InstantIso,
  TimeZoneId,
} from '../../../domain/types'
import { messages } from '../../../app/i18n/pt-BR.messages'
import type { ComparatorAnalyzedScenario } from './analysis'

export interface CreateComparatorCalculationRecordParams {
  id?: string
  createdAt?: InstantIso
  analyzedScenarios: ReadonlyArray<ComparatorAnalyzedScenario>
  displayWindow: DisplayWindow
  calendarTimeZone: TimeZoneId
  scaleMode: ChartScaleMode
  yAxisMode: ChartYAxisMode
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // fallback
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Monta o snapshot defensivo de CalculationRecord para a análise multicenário (§11, §15, E9).
 * - Função pura e determinística.
 * - Não executa o motor nem faz amostragem novamente.
 * - Cardinalidade exata 1:1 entre cenários e séries visuais.
 */
export function createComparatorCalculationRecord(
  params: CreateComparatorCalculationRecordParams,
): CalculationRecord {
  const {
    id = crypto.randomUUID(),
    createdAt = new Date().toISOString(),
    analyzedScenarios,
    displayWindow,
    calendarTimeZone,
    scaleMode,
    yAxisMode,
  } = params

  if (analyzedScenarios.length === 0) {
    throw new Error('Nenhum cenário analisado para salvar no registro.')
  }

  const primaryScenario = analyzedScenarios[0].scenario
  const title =
    analyzedScenarios.length === 1
      ? messages.comparator.singleRecordTitle(primaryScenario.name)
      : messages.comparator.multiRecordTitle(analyzedScenarios.length)

  const pkEngineVersion = analyzedScenarios[0].result.metadata.pkEngineVersion

  return {
    id,
    createdAt,
    display: {
      title,
      color: primaryScenario.color,
    },
    type: 'pharmacokinetics',
    versions: {
      pkEngineVersion,
      datasetVersion: CURRENT_DATASET_VERSION,
    },
    scenarios: analyzedScenarios.map((item) => ({
      scenarioId: item.scenario.id,
      scenarioSnapshot: cloneValue(item.scenario),
      simulationInput: cloneValue(item.simulationInput),
      resultSnapshot: {
        currentState: cloneValue(item.result.currentState),
        analysisCurve: cloneValue(item.result.analysisCurve),
        peak: cloneValue(item.result.peak),
        milestones: cloneValue(item.result.milestones),
        warnings: cloneValue(item.result.warnings),
        metadata: cloneValue(item.result.metadata),
      },
    })),
    chartViewSnapshot: {
      displayWindow: cloneValue(displayWindow),
      calendarTimeZone,
      scaleMode,
      yAxisMode,
      displayPointsByScenario: analyzedScenarios.map((item) => ({
        scenarioId: item.scenario.id,
        label: item.scenario.name,
        color: item.scenario.color,
        points: cloneValue(item.snapshotPoints),
      })),
    },
  }
}
