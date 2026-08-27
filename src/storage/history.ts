// Gestão de persistência e poda determinística FIFO do histórico (§11, §13).
// Limites:
// - cada registro ≤ 8 MiB (CALCULATION_RECORD_BYTES_MAX)
// - total de registros ≤ 500 (HISTORY_RECORDS_MAX)
// - histórico total ≤ 47 MiB (HISTORY_TOTAL_BYTES_MAX)
// - FullBackup projetado ≤ 64 MiB (FULL_BACKUP_IMPORT_BYTES_MAX)

import type { CalculationRecord, ConfigPayload, FullBackupBundle } from '../domain/types'
import { dataManagementError, type DataManagementError } from '../domain/shared/errors'
import { CURRENT_DATASET_VERSION, ENGINE_VERSIONS } from '../domain/version'
import { SAFETY_LIMITS } from '../validation/limits'
import { serializedUtf8Bytes } from './bytes'
import { deleteFromStore, getAllFromStore, loadConfigPayload, putToStore } from './idb'

export type AddCalculationRecordResult =
  | {
      ok: true
      record: CalculationRecord
      evictedCount: number
      evictedBytes: number
    }
  | {
      ok: false
      error: DataManagementError
    }

/**
 * Calcula os bytes de um FullBackupBundle projetado com um determinado ConfigPayload e histórico.
 */
export function calculateProjectedFullBackupBytes(
  configPayload: ConfigPayload,
  history: CalculationRecord[],
): number {
  const projectedBundle: FullBackupBundle = {
    bundleKind: 'full-backup',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    datasetVersion: CURRENT_DATASET_VERSION,
    engineVersions: ENGINE_VERSIONS,
    payload: configPayload,
    history,
    counts: {
      records: history.length,
      recipes: configPayload.recipes.length,
      scenarios: configPayload.scenarios.length,
      protocols: configPayload.protocols.length,
    },
  }
  return serializedUtf8Bytes(projectedBundle)
}

/**
 * Insere um novo CalculationRecord no histórico, aplicando validação individual de 8 MiB
 * e poda FIFO determinística sobre os registros mais antigos.
 */
export async function addCalculationRecord(
  record: CalculationRecord,
): Promise<AddCalculationRecordResult> {
  // 1. Serializar e verificar tamanho individual
  const recordBytes = serializedUtf8Bytes(record)
  if (recordBytes > SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX) {
    return {
      ok: false,
      error: dataManagementError('CALCULATION_RECORD_TOO_LARGE', {
        bytes: recordBytes,
        maxBytes: SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX,
      }),
    }
  }

  // 2. Carregar histórico atual e ConfigPayload
  const history = await getAllFromStore<CalculationRecord>('history')
  // Ordena por data de criação / inserção (mais antigos no índice 0)
  history.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const configPayload = await loadConfigPayload()

  // Adiciona o novo registro
  const updatedHistory = [...history, record]
  await putToStore('history', record)

  // 3. Poda determinística FIFO dos mais antigos enquanto qualquer condição for violada
  let evictedCount = 0
  let evictedBytes = 0

  while (
    updatedHistory.length > 1 &&
    (updatedHistory.length > SAFETY_LIMITS.HISTORY_RECORDS_MAX ||
      serializedUtf8Bytes(updatedHistory) > SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX ||
      calculateProjectedFullBackupBytes(configPayload, updatedHistory) >
        SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX)
  ) {
    const oldest = updatedHistory[0]
    // Nunca remover o registro recém-criado
    if (oldest.id === record.id) {
      break
    }
    const b = serializedUtf8Bytes(oldest)
    await deleteFromStore('history', oldest.id)
    updatedHistory.shift()
    evictedCount++
    evictedBytes += b
  }

  return {
    ok: true,
    record,
    evictedCount,
    evictedBytes,
  }
}

/**
 * Aplica poda FIFO no histórico após mutações no ConfigPayload que façam o FullBackup projetado exceder 64 MiB.
 */
export async function pruneHistoryForConfigMutation(
  configPayload: ConfigPayload,
): Promise<{ evictedCount: number; evictedBytes: number }> {
  const history = await getAllFromStore<CalculationRecord>('history')
  history.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  let evictedCount = 0
  let evictedBytes = 0

  while (
    history.length > 0 &&
    calculateProjectedFullBackupBytes(configPayload, history) >
      SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX
  ) {
    const oldest = history[0]
    const b = serializedUtf8Bytes(oldest)
    await deleteFromStore('history', oldest.id)
    history.shift()
    evictedCount++
    evictedBytes += b
  }

  return { evictedCount, evictedBytes }
}

/**
 * Retorna todos os registros históricos persistidos.
 */
export async function getCalculationRecords(): Promise<CalculationRecord[]> {
  const records = await getAllFromStore<CalculationRecord>('history')
  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // Mais recentes primeiro para listagem
  return records
}

/**
 * Obtém um registro por ID.
 */
export async function getCalculationRecordById(
  id: string,
): Promise<CalculationRecord | undefined> {
  const records = await getAllFromStore<CalculationRecord>('history')
  return records.find((r) => r.id === id)
}

/**
 * Remove um registro específico do histórico.
 */
export async function deleteCalculationRecord(id: string): Promise<void> {
  await deleteFromStore('history', id)
}
