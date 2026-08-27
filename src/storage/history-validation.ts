import type { CalculationRecord, ProtocolComponentKey } from '../domain/types'
import { CURRENT_DATASET_VERSION } from '../domain/version'
import { SAFETY_LIMITS } from '../validation/limits'
import { calculationRecordSchema } from '../validation/schemas/data-management'

export function encodeProtocolComponentKey(key: ProtocolComponentKey): string {
  return JSON.stringify([key.protocolId, key.componentId])
}

export type HistoricalValidationResult =
  | { valid: true }
  | { valid: false; error: string; internalReason: string }

function invalid(internalReason: string, error: string): HistoricalValidationResult {
  return { valid: false, internalReason, error }
}

export function validateCalculationRecordRuntime(record: unknown): HistoricalValidationResult {
  const parsed = calculationRecordSchema.safeParse(record)
  if (!parsed.success) return invalid('STRUCTURAL_VALIDATION_FAILED', parsed.error.message)
  const value = parsed.data as CalculationRecord
  if (value.versions.datasetVersion > CURRENT_DATASET_VERSION) {
    return invalid('FUTURE_DATASET_VERSION', 'CalculationRecord usa datasetVersion futuro')
  }

  if (value.type === 'pharmacokinetics') {
    const scenarioIds = new Set<string>()
    for (const scenario of value.scenarios) {
      if (scenario.scenarioSnapshot.id !== scenario.scenarioId) {
        return invalid('PK_SCENARIO_ID_MISMATCH', 'Incoerência de scenarioId no PK record')
      }
      if (scenarioIds.has(scenario.scenarioId)) {
        return invalid('DUPLICATE_PK_SCENARIO_ID', 'scenarioId duplicado no PK record')
      }
      scenarioIds.add(scenario.scenarioId)
    }

    const visualIds = new Set<string>()
    for (const series of value.chartViewSnapshot.displayPointsByScenario) {
      if (visualIds.has(series.scenarioId)) {
        return invalid('DUPLICATE_PK_DISPLAY_SERIES', 'Série visual duplicada no ChartViewSnapshot')
      }
      visualIds.add(series.scenarioId)
      if (series.points.length > SAFETY_LIMITS.DISPLAY_POINTS_PER_SERIES_MAX) {
        return invalid('DISPLAY_POINTS_LIMIT_EXCEEDED', `Série visual excede ${SAFETY_LIMITS.DISPLAY_POINTS_PER_SERIES_MAX} pontos`)
      }
      for (const point of series.points) {
        if (value.chartViewSnapshot.scaleMode === 'absolute' && point.valueKind !== 'mg') {
          return invalid('PK_SCALE_VALUE_KIND_MISMATCH', 'Ponto absolute deve usar valueKind mg')
        }
        if (value.chartViewSnapshot.scaleMode === 'normalized') {
          if (point.valueKind !== 'normalized_ratio') {
            return invalid('PK_SCALE_VALUE_KIND_MISMATCH', 'Ponto normalized deve usar normalized_ratio')
          }
          if (!Number.isFinite(point.value) || point.value < 0 || point.value > 1) {
            return invalid('NORMALIZED_VALUE_OUT_OF_RANGE', 'normalized_ratio fora de [0,1]')
          }
        }
      }
    }
    if (scenarioIds.size !== visualIds.size || [...scenarioIds].some((id) => !visualIds.has(id))) {
      return invalid('PK_SCIENCE_DISPLAY_BIJECTION_FAILED', 'Bijeção 1:1 entre cenários e séries visuais violada')
    }
  }

  if (value.type === 'protocol-analysis') {
    if (value.protocolsSnapshot.length === 0) {
      return invalid('EMPTY_PROTOCOL_SNAPSHOT', 'protocol-analysis possui protocolsSnapshot vazio')
    }
    const protocolIds = new Set<string>()
    const validKeys = new Set<string>()
    for (const protocol of value.protocolsSnapshot) {
      if (protocolIds.has(protocol.id)) return invalid('DUPLICATE_PROTOCOL_ID', `Protocol.id duplicado: ${protocol.id}`)
      protocolIds.add(protocol.id)
      const componentIds = new Set<string>()
      for (const component of protocol.components) {
        if (componentIds.has(component.id)) {
          return invalid('DUPLICATE_COMPONENT_ID', `component.id duplicado em ${protocol.id}: ${component.id}`)
        }
        componentIds.add(component.id)
        validKeys.add(encodeProtocolComponentKey({ protocolId: protocol.id, componentId: component.id }))
      }
    }

    const seriesKeys = new Set<string>()
    for (const series of value.snapshot.series) {
      const key = encodeProtocolComponentKey(series.key)
      if (seriesKeys.has(key)) return invalid('DUPLICATE_PROTOCOL_SERIES_KEY', `Chave duplicada em series: ${key}`)
      if (!validKeys.has(key)) return invalid('ORPHAN_PROTOCOL_SERIES_KEY', `Chave de série órfã: ${key}`)
      if (series.displayPoints.length > SAFETY_LIMITS.DISPLAY_POINTS_PER_SERIES_MAX) {
        return invalid('DISPLAY_POINTS_LIMIT_EXCEEDED', `Série de protocolo excede ${SAFETY_LIMITS.DISPLAY_POINTS_PER_SERIES_MAX} pontos`)
      }
      seriesKeys.add(key)
    }

    const inputKeys = new Set<string>()
    for (const input of value.simulationInputs) {
      const key = encodeProtocolComponentKey(input.key)
      if (inputKeys.has(key)) return invalid('DUPLICATE_PROTOCOL_INPUT_KEY', `Chave duplicada em simulationInputs: ${key}`)
      if (!validKeys.has(key)) return invalid('ORPHAN_PROTOCOL_INPUT_KEY', `Chave de input órfã: ${key}`)
      inputKeys.add(key)
    }
    if (seriesKeys.size !== inputKeys.size || [...seriesKeys].some((key) => !inputKeys.has(key))) {
      return invalid('PROTOCOL_SERIES_INPUT_BIJECTION_FAILED', 'Bijeção 1:1 entre series e simulationInputs violada')
    }
  }

  return { valid: true }
}

export function validateHistoricalInvariants(history: unknown[]): HistoricalValidationResult {
  const ids = new Set<string>()
  for (const record of history) {
    const validation = validateCalculationRecordRuntime(record)
    if (!validation.valid) return validation
    const id = (record as CalculationRecord).id
    if (ids.has(id)) return invalid('DUPLICATE_HISTORY_ID', `CalculationRecord.id duplicado: ${id}`)
    ids.add(id)
  }
  return { valid: true }
}
