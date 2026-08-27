// Validação de budget e atomicidade de mutações em ConfigPayload (§11, §12).
// Limite: SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX = 15_728_640 (15 MiB).

import type { ConfigPayload } from '../domain/types'
import { dataManagementError, type DataManagementError } from '../domain/shared/errors'
import { SAFETY_LIMITS } from '../validation/limits'
import { serializedUtf8Bytes } from './bytes'
import { loadConfigPayload, saveConfigPayload } from './idb'

export type ConfigMutationResult =
  | { ok: true; payload: ConfigPayload }
  | { ok: false; error: DataManagementError }

/**
 * Valida se um ConfigPayload projetado respeita o limite normativo de 15 MiB.
 */
export function validateProjectedConfigPayload(
  payload: ConfigPayload,
): { ok: true; bytes: number } | { ok: false; error: DataManagementError; bytes: number } {
  const bytes = serializedUtf8Bytes(payload)
  if (bytes > SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX) {
    return {
      ok: false,
      error: dataManagementError('CONFIG_STORAGE_LIMIT_EXCEEDED', {
        bytes,
        maxBytes: SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX,
      }),
      bytes,
    }
  }
  return { ok: true, bytes }
}

/**
 * Executa uma mutação atômica sobre o ConfigPayload persistido.
 * Se a mutação projetada ultrapassar 15 MiB, a mutação é abortada e o storage não é alterado.
 */
export async function mutateConfigPayload(
  mutator: (current: ConfigPayload) => ConfigPayload | Promise<ConfigPayload>,
): Promise<ConfigMutationResult> {
  const current = await loadConfigPayload()
  const projected = await mutator(current)

  const validation = validateProjectedConfigPayload(projected)
  if (!validation.ok) {
    return { ok: false, error: validation.error }
  }

  await saveConfigPayload(projected)
  return { ok: true, payload: projected }
}
