import { CURRENT_DATASET_VERSION } from '../../../domain/version'
import type { CalculationRecord, ReconstitutionInput, ReconstitutionResult } from '../../../domain/types'
import { messages } from '../../../app/i18n/pt-BR.messages'

export interface ReconstitutionCalculationRecordOptions {
  id: string
  createdAt: string
  input: ReconstitutionInput
  result: ReconstitutionResult
  title?: string
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // O fallback JSON abaixo cobre o objeto numérico do registro.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}

/** Cria um snapshot de histórico sem recalcular ou mutar os dados de domínio. */
export function createReconstitutionCalculationRecord(
  options: ReconstitutionCalculationRecordOptions,
): CalculationRecord {
  const input = cloneValue(options.input)
  const result = cloneValue(options.result)

  return {
    id: options.id,
    createdAt: options.createdAt,
    display: {
      title: options.title ?? messages.reconstitution.historyTitle(input.label ?? ''),
      color: 'emerald-500',
    },
    type: 'reconstitution',
    versions: {
      reconstitutionEngineVersion: result.metadata.reconstitutionEngineVersion,
      datasetVersion: CURRENT_DATASET_VERSION,
    },
    input,
    resultSnapshot: result,
  }
}
