// Gestão de persistência e poda determinística FIFO do histórico (§11, §13).
// Limites:
// - cada registro ≤ 8 MiB (CALCULATION_RECORD_BYTES_MAX)
// - total de registros ≤ 500 (HISTORY_RECORDS_MAX)
// - histórico total ≤ 47 MiB (HISTORY_TOTAL_BYTES_MAX)
// - FullBackup projetado ≤ 64 MiB (FULL_BACKUP_IMPORT_BYTES_MAX)
// - FIFO ordenado estritamente por insertionOrder persistida (nunca por createdAt).
// - Imutabilidade por ID: ID já existente não sobrescreve registro histórico.

import type { CalculationRecord, ConfigPayload, FullBackupBundle, StoredHistoryEntry } from '../domain/types'
import { dataManagementError, type DataManagementError } from '../domain/shared/errors'
import { CURRENT_DATASET_VERSION, ENGINE_VERSIONS } from '../domain/version'
import { SAFETY_LIMITS } from '../validation/limits'
import { calculationRecordSchema } from '../validation/schemas/data-management'
import { serializedUtf8Bytes } from './bytes'
import { commitStorageOperations, deleteFromStore, getAllFromStore, getFromStore, loadConfigPayload } from './idb'
import { validateCalculationRecordRuntime } from './history-validation'

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
 * Insere um novo CalculationRecord no histórico, aplicando validação individual de 8 MiB,
 * imutabilidade por ID e poda FIFO determinística por ordem de inserção sobre os registros mais antigos.
 */
export async function addCalculationRecord(
  record: CalculationRecord,
): Promise<AddCalculationRecordResult> {
  // Objetos TypeScript também cruzam uma fronteira de confiança em runtime.
  const parsedRecord = calculationRecordSchema.safeParse(record)
  const runtimeValidation = validateCalculationRecordRuntime(record)
  if (!parsedRecord.success || !runtimeValidation.valid) {
    return {
      ok: false,
      error: dataManagementError('CALCULATION_RECORD_TOO_LARGE', undefined, {
        internalReason: runtimeValidation.valid ? 'STRUCTURAL_VALIDATION_FAILED' : runtimeValidation.internalReason,
        validationDetails: runtimeValidation.valid
          ? (!parsedRecord.success ? parsedRecord.error.message : 'CalculationRecord inválido')
          : runtimeValidation.error,
      }),
    }
  }

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

  // 2. Verificar imutabilidade por ID (registro com mesmo ID não sobrescreve nem altera histórico)
  const existing = await getFromStore<StoredHistoryEntry>('history', record.id)
  if (existing) {
    return {
      ok: false,
      error: dataManagementError('CALCULATION_RECORD_TOO_LARGE', undefined, {
        internalReason: 'DUPLICATE_HISTORY_ID',
        validationDetails: `CalculationRecord.id já existe: ${record.id}`,
      }),
    }
  }

  // 3. Carregar entradas atuais de histórico
  const entries = await getAllFromStore<StoredHistoryEntry>('history')
  // Ordena por insertionOrder crescente (mais antigas inseridas no início)
  entries.sort((a, b) => a.insertionOrder - b.insertionOrder)

  let maxOrder = 0
  for (const e of entries) {
    if (e.insertionOrder > maxOrder) {
      maxOrder = e.insertionOrder
    }
  }

  const newEntry: StoredHistoryEntry = {
    id: record.id,
    insertionOrder: maxOrder + 1,
    record,
  }

  const configPayload = await loadConfigPayload()
  const updatedEntries = [...entries, newEntry]

  // 4. Poda determinística FIFO dos mais antigos por insertionOrder
  let evictedCount = 0
  let evictedBytes = 0

  while (
    updatedEntries.length > 1 &&
    (updatedEntries.length > SAFETY_LIMITS.HISTORY_RECORDS_MAX ||
      serializedUtf8Bytes(updatedEntries.map((e) => e.record)) > SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX ||
      calculateProjectedFullBackupBytes(
        configPayload,
        updatedEntries.map((e) => e.record),
      ) > SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX)
  ) {
    const oldest = updatedEntries[0]
    // Nunca remove a entrada recém-adicionada
    if (oldest.id === record.id) {
      break
    }
    const b = serializedUtf8Bytes(oldest.record)
    updatedEntries.shift()
    evictedCount++
    evictedBytes += b
  }

  // Evicções e inserção formam uma única mutação lógica/transação.
  const retainedIds = new Set(updatedEntries.map((entry) => entry.id))
  const evictedIds = entries.filter((entry) => !retainedIds.has(entry.id)).map((entry) => entry.id)
  await commitStorageOperations([
    ...evictedIds.map((key) => ({ kind: 'delete' as const, store: 'history' as const, key })),
    { kind: 'put', store: 'history', value: newEntry },
  ])

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
  const entries = await getAllFromStore<StoredHistoryEntry>('history')
  entries.sort((a, b) => a.insertionOrder - b.insertionOrder)

  let evictedCount = 0
  let evictedBytes = 0
  const evictedIds: string[] = []

  while (
    entries.length > 0 &&
    calculateProjectedFullBackupBytes(
      configPayload,
      entries.map((e) => e.record),
    ) > SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX
  ) {
    const oldest = entries[0]
    const b = serializedUtf8Bytes(oldest.record)
    entries.shift()
    evictedIds.push(oldest.id)
    evictedCount++
    evictedBytes += b
  }

  await commitStorageOperations(
    evictedIds.map((key) => ({ kind: 'delete' as const, store: 'history' as const, key })),
  )

  return { evictedCount, evictedBytes }
}

/**
 * Retorna todos os registros históricos persistidos, ordenados da inserção mais recente para a mais antiga.
 */
export async function getCalculationRecords(): Promise<CalculationRecord[]> {
  const entries = await getAllFromStore<StoredHistoryEntry>('history')
  entries.sort((a, b) => b.insertionOrder - a.insertionOrder)
  return entries.map((e) => e.record)
}

/**
 * Obtém um registro por ID.
 */
export async function getCalculationRecordById(
  id: string,
): Promise<CalculationRecord | undefined> {
  const entry = await getFromStore<StoredHistoryEntry>('history', id)
  return entry?.record
}

/**
 * Remove um registro específico do histórico.
 */
export async function deleteCalculationRecord(id: string): Promise<void> {
  await deleteFromStore('history', id)
}
