// Construtores e exportadores de bundles de configuração e backup completo (§6, §11, §15).
// Export é JSON UTF-8 não comprimido, sem consentimento e sem dados de quarentena.
// Validação integral do estado antes de exportar: retorna EXPORT_SIZE_LIMIT_EXCEEDED se limites forem violados.

import type {
  CalculationRecord,
  ConfigExportBundle,
  ConfigPayload,
  FullBackupBundle,
  InstantIso,
} from '../domain/types'
import { dataManagementError, type DataManagementError } from '../domain/shared/errors'
import { CURRENT_DATASET_VERSION, ENGINE_VERSIONS } from '../domain/version'
import {
  configExportBundleSchema,
  configPayloadSchema,
  fullBackupBundleSchema,
} from '../validation/schemas/data-management'
import { SAFETY_LIMITS } from '../validation/limits'
import { serializedUtf8Bytes } from './bytes'
import { clonePersistedValue } from './clone'
import { getCalculationRecords } from './history'
import { validateHistoricalInvariants } from './history-validation'
import { loadConfigPayload } from './idb'
import { validateConfigReferences } from './references'

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
  // 1. Validação estrutural do payload
  const parsedPayload = configPayloadSchema.safeParse(payload)
  if (!parsedPayload.success) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes: 0,
        maxBytes: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX,
      }, { internalReason: 'STRUCTURAL_VALIDATION_FAILED', validationDetails: parsedPayload.error.message }),
    }
  }

  // Snapshot isolado defensivo (§11, §15, E6.5)
  const payloadSnapshot = clonePersistedValue(parsedPayload.data)

  // 2. Validação de integridade referencial
  const refCheck = validateConfigReferences(payloadSnapshot)
  if (!refCheck.valid) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes: 0,
        maxBytes: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX,
      }, { internalReason: 'REFERENCE_VALIDATION_FAILED', validationDetails: refCheck.error }),
    }
  }

  // 3. Validação de budget do payload
  const payloadBytes = serializedUtf8Bytes(payloadSnapshot)
  if (payloadBytes > SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes: payloadBytes,
        maxBytes: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX,
      }, { internalReason: 'PAYLOAD_SIZE_EXCEEDED' }),
    }
  }

  const bundle: ConfigExportBundle = {
    bundleKind: 'config',
    schemaVersion: 1,
    exportedAt: exportedAt || (new Date().toISOString() as InstantIso),
    datasetVersion: CURRENT_DATASET_VERSION,
    engineVersions: ENGINE_VERSIONS,
    payload: payloadSnapshot,
  }

  // 4. Validação do schema do bundle completo
  const parsedBundle = configExportBundleSchema.safeParse(bundle)
  if (!parsedBundle.success) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes: 0,
        maxBytes: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX,
      }),
    }
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
  // 1. Validações estruturais e de referências do payload
  const parsedPayload = configPayloadSchema.safeParse(payload)
  if (!parsedPayload.success) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes: 0,
        maxBytes: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
      }, { internalReason: 'STRUCTURAL_VALIDATION_FAILED', validationDetails: parsedPayload.error.message }),
    }
  }

  // Snapshots isolados defensivos (§11, §15, E6.5)
  const payloadSnapshot = clonePersistedValue(parsedPayload.data)
  const historySnapshot = clonePersistedValue(history)

  const refCheck = validateConfigReferences(payloadSnapshot)
  if (!refCheck.valid) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes: 0,
        maxBytes: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
      }, { internalReason: 'REFERENCE_VALIDATION_FAILED', validationDetails: refCheck.error }),
    }
  }

  // 2. Validações de limites de histórico
  if (historySnapshot.length > SAFETY_LIMITS.HISTORY_RECORDS_MAX) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes: serializedUtf8Bytes(historySnapshot),
        maxBytes: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
      }),
    }
  }

  for (const record of historySnapshot) {
    const b = serializedUtf8Bytes(record)
    if (b > SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX) {
      return {
        ok: false,
        error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
          bytes: b,
          maxBytes: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
        }),
      }
    }
  }

  const totalHistoryBytes = serializedUtf8Bytes(historySnapshot)
  if (totalHistoryBytes > SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes: totalHistoryBytes,
        maxBytes: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
      }),
    }
  }

  const historical = validateHistoricalInvariants(historySnapshot)
  if (!historical.valid) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', undefined, {
        internalReason: historical.internalReason,
        validationDetails: historical.error,
      }),
    }
  }

  const bundle: FullBackupBundle = {
    bundleKind: 'full-backup',
    schemaVersion: 1,
    exportedAt: exportedAt || (new Date().toISOString() as InstantIso),
    datasetVersion: CURRENT_DATASET_VERSION,
    engineVersions: ENGINE_VERSIONS,
    payload: payloadSnapshot,
    history: historySnapshot,
    counts: {
      records: historySnapshot.length,
      recipes: payloadSnapshot.recipes.length,
      scenarios: payloadSnapshot.scenarios.length,
      protocols: payloadSnapshot.protocols.length,
    },
  }

  // 3. Validação do schema do bundle completo
  const parsedBundle = fullBackupBundleSchema.safeParse(bundle)
  if (!parsedBundle.success) {
    return {
      ok: false,
      error: dataManagementError('EXPORT_SIZE_LIMIT_EXCEEDED', {
        bytes: 0,
        maxBytes: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
      }),
    }
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
 * Exporta o backup completo atual do sistema (configurações + histórico ordenado).
 */
export async function exportCurrentFullBackup(exportedAt?: InstantIso): Promise<ExportResult<FullBackupBundle>> {
  const payload = await loadConfigPayload()
  const history = await getCalculationRecords()
  return buildFullBackup(payload, history, exportedAt)
}
