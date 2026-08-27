// Construtores e exportadores de bundles de configuração e backup completo (§6, §11, §15).
// Export é JSON UTF-8 não comprimido, sem consentimento e sem dados de quarentena.
// Defesa de limite: retorna EXPORT_SIZE_LIMIT_EXCEEDED se um bug/corrupção violar o teto.

import type {
  CalculationRecord,
  ConfigExportBundle,
  ConfigPayload,
  FullBackupBundle,
  InstantIso,
} from '../domain/types'
import { dataManagementError, type DataManagementError } from '../domain/shared/errors'
import { CURRENT_DATASET_VERSION, ENGINE_VERSIONS } from '../domain/version'
import { SAFETY_LIMITS } from '../validation/limits'
import { serializedUtf8Bytes } from './bytes'
import { getAllFromStore, loadConfigPayload } from './idb'

export type ExportResult<T> =
  | { ok: true; bundle: T; json: string; bytes: number }
  | { ok: false; error: DataManagementError }

/**
 * Constrói e valida um ConfigExportBundle a partir do ConfigPayload fornecido.
 */
export function buildConfigExport(
  payload: ConfigPayload,
  exportedAt?: InstantIso,
): ExportResult<ConfigExportBundle> {
  const bundle: ConfigExportBundle = {
    bundleKind: 'config',
    schemaVersion: 1,
    exportedAt: exportedAt || (new Date().toISOString() as InstantIso),
    datasetVersion: CURRENT_DATASET_VERSION,
    engineVersions: ENGINE_VERSIONS,
    payload,
  }

  const bytes = serializedUtf8Bytes(bundle)
  if (bytes > SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes,
        maxBytes: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX,
      }),
    }
  }

  return {
    ok: true,
    bundle,
    json: JSON.stringify(bundle),
    bytes,
  }
}

/**
 * Constrói e valida um FullBackupBundle a partir do ConfigPayload e histórico fornecidos.
 */
export function buildFullBackup(
  payload: ConfigPayload,
  history: CalculationRecord[],
  exportedAt?: InstantIso,
): ExportResult<FullBackupBundle> {
  const bundle: FullBackupBundle = {
    bundleKind: 'full-backup',
    schemaVersion: 1,
    exportedAt: exportedAt || (new Date().toISOString() as InstantIso),
    datasetVersion: CURRENT_DATASET_VERSION,
    engineVersions: ENGINE_VERSIONS,
    payload,
    history,
    counts: {
      records: history.length,
      recipes: payload.recipes.length,
      scenarios: payload.scenarios.length,
      protocols: payload.protocols.length,
    },
  }

  const bytes = serializedUtf8Bytes(bundle)
  if (bytes > SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes,
        maxBytes: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
      }),
    }
  }

  return {
    ok: true,
    bundle,
    json: JSON.stringify(bundle),
    bytes,
  }
}

/**
 * Exporta o estado configurável atual do sistema.
 */
export async function exportCurrentConfig(exportedAt?: InstantIso): Promise<ExportResult<ConfigExportBundle>> {
  const payload = await loadConfigPayload()
  return buildConfigExport(payload, exportedAt)
}

/**
 * Exporta o backup completo atual do sistema (configurações + histórico).
 */
export async function exportCurrentFullBackup(exportedAt?: InstantIso): Promise<ExportResult<FullBackupBundle>> {
  const payload = await loadConfigPayload()
  const history = await getAllFromStore<CalculationRecord>('history')
  history.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return buildFullBackup(payload, history, exportedAt)
}
