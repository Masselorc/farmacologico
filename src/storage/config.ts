// Validação de budget e atomicidade de mutações em ConfigPayload (§11, §12, E6.3).
// Limite: SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX = 15_728_640 (15 MiB).
// Poda determinística FIFO do histórico acionada automaticamente se FullBackup > 64 MiB.
// Mutex global e isolamento estrito de referências mutáveis.

import type { ConfigMutationResult, ConfigPayload, StoredHistoryEntry } from '../domain/types'
import { dataManagementError, type DataManagementError } from '../domain/shared/errors'
import { SAFETY_LIMITS } from '../validation/limits'
import { configPayloadSchema } from '../validation/schemas/data-management'
import { serializedUtf8Bytes } from './bytes'
import { clonePersistedValue } from './clone'
import { calculateProjectedFullBackupBytes } from './history'
import { getAllFromStore, loadConfigPayload, replaceConfigAndPruneHistory } from './idb'
import { enqueueStorageMutation } from './queue'
import { validateConfigReferences } from './references'

export type { ConfigMutationResult }
export { loadConfigPayload } from './idb'


/**
 * Valida se um ConfigPayload projetado respeita o limite normativo de 15 MiB e a integridade de referências.
 */
export function validateProjectedConfigPayload(
  payload: ConfigPayload,
): { ok: true; bytes: number } | { ok: false; error: DataManagementError; bytes: number } {
  const structural = configPayloadSchema.safeParse(payload)
  const bytes = serializedUtf8Bytes(payload)
  if (!structural.success) {
    return {
      ok: false,
      error: dataManagementError('CONFIG_STORAGE_LIMIT_EXCEEDED', undefined, {
        internalReason: 'STRUCTURAL_VALIDATION_FAILED',
        validationDetails: structural.error.message,
      }),
      bytes,
    }
  }
  if (bytes > SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX) {
    return {
      ok: false,
      error: dataManagementError('CONFIG_STORAGE_LIMIT_EXCEEDED', {
        bytes,
        maxBytes: SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX,
      }, { internalReason: 'PAYLOAD_SIZE_EXCEEDED' }),
      bytes,
    }
  }

  const refCheck = validateConfigReferences(structural.data)
  if (!refCheck.valid) {
    return {
      ok: false,
      error: dataManagementError('CONFIG_STORAGE_LIMIT_EXCEEDED', undefined, {
        internalReason: 'REFERENCE_VALIDATION_FAILED',
        validationDetails: refCheck.error,
      }),
      bytes,
    }
  }

  return { ok: true, bytes }
}

/**
 * Executa uma mutação atômica e serializada sobre o ConfigPayload persistido (§11, E6.3).
 * Se a mutação projetada ultrapassar 15 MiB ou violar referências, a mutação é abortada e o storage não é alterado.
 * Se a mutação fizer o FullBackup projetado ultrapassar 64 MiB, o histórico é podado deterministicamente por FIFO.
 */
export async function mutateConfigPayload(
  mutator: (current: ConfigPayload) => ConfigPayload | Promise<ConfigPayload>,
): Promise<ConfigMutationResult> {
  return enqueueStorageMutation(async () => {
    const current = await loadConfigPayload()
    const projected = await mutator(current)
    const clonedProjected = clonePersistedValue(projected)

    const validation = validateProjectedConfigPayload(clonedProjected)
    if (!validation.ok) {
      return { ok: false, error: validation.error }
    }

    // Carrega histórico para checar FullBackup projetado
    const entries = await getAllFromStore<StoredHistoryEntry>('history')
    entries.sort((a, b) => a.insertionOrder - b.insertionOrder)

    let evictedHistoryCount = 0
    let evictedHistoryBytes = 0
    const evictedHistoryIds: string[] = []

    while (
      entries.length > 0 &&
      calculateProjectedFullBackupBytes(
        clonedProjected,
        entries.map((e) => e.record),
      ) > SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX
    ) {
      const oldest = entries[0]
      const b = serializedUtf8Bytes(oldest.record)
      entries.shift()
      evictedHistoryIds.push(oldest.id)
      evictedHistoryCount++
      evictedHistoryBytes += b
    }

    await replaceConfigAndPruneHistory(clonedProjected, evictedHistoryIds)

    return {
      ok: true,
      payload: clonePersistedValue(clonedProjected),
      evictedHistoryCount,
      evictedHistoryBytes,
    }
  })
}
