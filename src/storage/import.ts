// Pipeline de importação E6.2: guarda pré-leitura, validação estrita,
// versões do runtime como autoridade e quarentena compacta byte-aware.

import type {
  ConfigExportBundle, ConfigImportPreview, FullBackupBundle,
  FullBackupImportPreview, ImportPreview, QuarantineSource,
} from '../domain/types'
import { dataManagementError, type DataManagementError } from '../domain/shared/errors'
import { CURRENT_DATASET_VERSION } from '../domain/version'
import { SAFETY_LIMITS } from '../validation/limits'
import { configExportBundleSchema, fullBackupBundleSchema } from '../validation/schemas/data-management'
import { serializedUtf8Bytes } from './bytes'
import { restoreFullBackup, saveConfigPayload } from './idb'
import { validateHistoricalInvariants } from './history-validation'
import { addQuarantineItem } from './quarantine'
import { enqueueStorageMutation } from './queue'
import { validateConfigReferences } from './references'

export { encodeProtocolComponentKey, validateHistoricalInvariants } from './history-validation'

export type FileSource =
  | File
  | { name: string; size: number; text: () => Promise<string>; arrayBuffer?: () => Promise<ArrayBuffer> }
  | { size?: number; content: string }

export interface InternalImportError {
  code?: never
  internalReason: string
  validationDetails?: string
}

export type ImportValidationResult<T extends ImportPreview> =
  | { ok: true; preview: T }
  | { ok: false; error: DataManagementError | InternalImportError; details?: string }

type ImportAction = 'config' | 'full-backup'

interface ReadSuccess { ok: true; rawText: string; rawBytes: number }
interface ReadFailure { ok: false; error: DataManagementError | InternalImportError; details?: string }

function internalFailure(internalReason: string, validationDetails?: string): InternalImportError {
  return { internalReason, ...(validationDetails ? { validationDetails } : {}) }
}

async function readSource(fileOrSource: FileSource, action: ImportAction): Promise<ReadSuccess | ReadFailure> {
  const maxBytes = action === 'config'
    ? SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX
    : SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX
  if ('size' in fileOrSource && typeof fileOrSource.size === 'number' && fileOrSource.size > maxBytes) {
    return { ok: false, error: dataManagementError('IMPORT_FILE_TOO_LARGE', {
      bytes: fileOrSource.size, maxBytes,
    }) }
  }

  let rawText: string
  if ('text' in fileOrSource && typeof fileOrSource.text === 'function') rawText = await fileOrSource.text()
  else if ('content' in fileOrSource) rawText = fileOrSource.content
  else return { ok: false, error: internalFailure('INVALID_FILE_SOURCE', 'Fonte de arquivo inválida') }

  const rawBytes = new TextEncoder().encode(rawText).byteLength
  if (rawBytes > maxBytes) {
    return { ok: false, error: dataManagementError('IMPORT_FILE_TOO_LARGE', { bytes: rawBytes, maxBytes }) }
  }
  return { ok: true, rawText, rawBytes }
}

async function quarantineFailure(
  source: QuarantineSource,
  errorCode: string,
  rawText: string,
  rawBytes: number,
): Promise<void> {
  await addQuarantineItem({
    source, errorCode, originalUtf8Bytes: rawBytes, rawExcerptUtf8: rawText,
  })
}

function kindMismatch(expected: ImportAction, received: unknown): DataManagementError {
  return dataManagementError('IMPORT_KIND_MISMATCH', {
    expected, received: typeof received === 'string' ? received : 'unknown',
  })
}

export async function validateAndPreviewConfigImport(
  fileOrSource: FileSource,
): Promise<ImportValidationResult<ConfigImportPreview>> {
  const read = await readSource(fileOrSource, 'config')
  if (!read.ok) return read
  const { rawText, rawBytes } = read

  let parsed: unknown
  try { parsed = JSON.parse(rawText) }
  catch (error) {
    const details = `JSON inválido: ${error instanceof Error ? error.message : String(error)}`
    await quarantineFailure('config_import', 'INVALID_JSON', rawText, rawBytes)
    return { ok: false, error: internalFailure('INVALID_JSON', details), details }
  }

  const receivedKind = typeof parsed === 'object' && parsed !== null
    ? (parsed as { bundleKind?: unknown }).bundleKind : undefined
  if (receivedKind !== 'config') {
    await quarantineFailure('config_import', 'IMPORT_KIND_MISMATCH', rawText, rawBytes)
    return { ok: false, error: kindMismatch('config', receivedKind) }
  }

  const schema = configExportBundleSchema.safeParse(parsed)
  if (!schema.success) {
    await quarantineFailure('config_import', 'SCHEMA_VALIDATION_FAILURE', rawText, rawBytes)
    return { ok: false, error: internalFailure('STRUCTURAL_VALIDATION_FAILED', schema.error.message), details: schema.error.message }
  }
  const bundle = schema.data as ConfigExportBundle
  if (bundle.datasetVersion > CURRENT_DATASET_VERSION) {
    await quarantineFailure('config_import', 'FUTURE_DATASET_VERSION', rawText, rawBytes)
    return { ok: false, error: internalFailure('FUTURE_DATASET_VERSION', `bundle.datasetVersion ${bundle.datasetVersion} > ${CURRENT_DATASET_VERSION}`) }
  }

  const references = validateConfigReferences(bundle.payload, CURRENT_DATASET_VERSION)
  if (!references.valid) {
    await quarantineFailure('config_import', 'CONFIG_REFERENCES_INVALID', rawText, rawBytes)
    return { ok: false, error: internalFailure('REFERENCE_VALIDATION_FAILED', references.error), details: references.error }
  }
  const payloadBytes = serializedUtf8Bytes(bundle.payload)
  if (payloadBytes > SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX) {
    await quarantineFailure('config_import', 'CONFIG_STORAGE_LIMIT_EXCEEDED', rawText, rawBytes)
    return { ok: false, error: dataManagementError('CONFIG_STORAGE_LIMIT_EXCEEDED', {
      bytes: payloadBytes, maxBytes: SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX,
    }) }
  }

  return { ok: true, preview: {
    actionKind: 'config', bundleKind: 'config', schemaVersion: bundle.schemaVersion,
    datasetVersion: bundle.datasetVersion, exportedAt: bundle.exportedAt,
    engineVersions: bundle.engineVersions,
    counts: {
      scenarios: bundle.payload.scenarios.length,
      protocols: bundle.payload.protocols.length,
      recipes: bundle.payload.recipes.length,
      customSubstances: bundle.payload.customSubstances.length,
      customProfiles: bundle.payload.customProfiles.length,
    },
    warnings: [], payload: bundle.payload,
  } }
}

export async function validateAndPreviewFullBackupImport(
  fileOrSource: FileSource,
): Promise<ImportValidationResult<FullBackupImportPreview>> {
  const read = await readSource(fileOrSource, 'full-backup')
  if (!read.ok) return read
  const { rawText, rawBytes } = read

  let parsed: unknown
  try { parsed = JSON.parse(rawText) }
  catch (error) {
    const details = `JSON inválido: ${error instanceof Error ? error.message : String(error)}`
    await quarantineFailure('full_backup_import', 'INVALID_JSON', rawText, rawBytes)
    return { ok: false, error: internalFailure('INVALID_JSON', details), details }
  }

  const receivedKind = typeof parsed === 'object' && parsed !== null
    ? (parsed as { bundleKind?: unknown }).bundleKind : undefined
  if (receivedKind !== 'full-backup') {
    await quarantineFailure('full_backup_import', 'IMPORT_KIND_MISMATCH', rawText, rawBytes)
    return { ok: false, error: kindMismatch('full-backup', receivedKind) }
  }

  const schema = fullBackupBundleSchema.safeParse(parsed)
  if (!schema.success) {
    await quarantineFailure('full_backup_import', 'SCHEMA_VALIDATION_FAILURE', rawText, rawBytes)
    return { ok: false, error: internalFailure('STRUCTURAL_VALIDATION_FAILED', schema.error.message), details: schema.error.message }
  }
  const bundle = schema.data as FullBackupBundle
  if (bundle.datasetVersion > CURRENT_DATASET_VERSION) {
    await quarantineFailure('full_backup_import', 'FUTURE_DATASET_VERSION', rawText, rawBytes)
    return { ok: false, error: internalFailure('FUTURE_DATASET_VERSION', `bundle.datasetVersion ${bundle.datasetVersion} > ${CURRENT_DATASET_VERSION}`) }
  }

  const references = validateConfigReferences(bundle.payload, CURRENT_DATASET_VERSION)
  if (!references.valid) {
    await quarantineFailure('full_backup_import', 'CONFIG_REFERENCES_INVALID', rawText, rawBytes)
    return { ok: false, error: internalFailure('REFERENCE_VALIDATION_FAILED', references.error), details: references.error }
  }
  const payloadBytes = serializedUtf8Bytes(bundle.payload)
  if (payloadBytes > SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX) {
    await quarantineFailure('full_backup_import', 'CONFIG_STORAGE_LIMIT_EXCEEDED', rawText, rawBytes)
    return { ok: false, error: dataManagementError('CONFIG_STORAGE_LIMIT_EXCEEDED', {
      bytes: payloadBytes, maxBytes: SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX,
    }) }
  }

  const historyBytes = serializedUtf8Bytes(bundle.history)
  if (historyBytes > SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX) {
    await quarantineFailure('full_backup_import', 'HISTORY_STORAGE_LIMIT_EXCEEDED', rawText, rawBytes)
    return { ok: false, error: internalFailure('HISTORY_SIZE_EXCEEDED', `${historyBytes} > ${SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX}`) }
  }
  for (const record of bundle.history) {
    const recordBytes = serializedUtf8Bytes(record)
    if (recordBytes > SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX) {
      await quarantineFailure('full_backup_import', 'CALCULATION_RECORD_TOO_LARGE', rawText, rawBytes)
      return { ok: false, error: dataManagementError('CALCULATION_RECORD_TOO_LARGE', {
        bytes: recordBytes, maxBytes: SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX,
      }) }
    }
  }

  if (bundle.counts.records !== bundle.history.length ||
      bundle.counts.recipes !== bundle.payload.recipes.length ||
      bundle.counts.scenarios !== bundle.payload.scenarios.length ||
      bundle.counts.protocols !== bundle.payload.protocols.length) {
    await quarantineFailure('full_backup_import', 'COUNTS_MISMATCH', rawText, rawBytes)
    return { ok: false, error: internalFailure('COUNTS_MISMATCH', 'Contagens declaradas não correspondem ao conteúdo') }
  }

  const historical = validateHistoricalInvariants(bundle.history)
  if (!historical.valid) {
    await quarantineFailure('full_backup_import', 'HISTORICAL_INVARIANTS_FAILURE', rawText, rawBytes)
    return { ok: false, error: internalFailure(historical.internalReason, historical.error), details: historical.error }
  }

  return { ok: true, preview: {
    actionKind: 'full-backup', bundleKind: 'full-backup', schemaVersion: bundle.schemaVersion,
    datasetVersion: bundle.datasetVersion, exportedAt: bundle.exportedAt,
    engineVersions: bundle.engineVersions, counts: bundle.counts,
    historyRecordsCount: bundle.history.length, warnings: [], bundle,
  } }
}

export async function applyImport(preview: ImportPreview): Promise<{ ok: true }> {
  return enqueueStorageMutation(async () => {
    if (preview.actionKind === 'config') await saveConfigPayload(preview.payload)
    else await restoreFullBackup(preview.bundle.payload, preview.bundle.history)
    return { ok: true }
  })
}
