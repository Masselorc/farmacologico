// Validador e importador de bundles com guarda pré-leitura de File.size e quarentena (§11, §16, §17).
// Ordem obrigatória:
// 1. Verificar File.size contra o cap da ação pretendida ANTES de qualquer leitura.
// 2. Se exceder, retornar IMPORT_FILE_TOO_LARGE sem chamar .text() e sem quarentenar.
// 3. Somente então ler o arquivo e fazer JSON.parse.
// 4. Validar bundleKind (kind divergente => IMPORT_KIND_MISMATCH).
// 5. Validar Zod schemas estritos e LIMITS.
// 6. Validar orçamentos internos (ConfigPayload ≤15 MiB, record ≤8 MiB, history ≤47 MiB e ≤500, FullBackup ≤64 MiB, counts).
// 7. Validar invariantes históricas (bijeção ciência↔visual em PK, razões em [0,1], chaves compostas de protocolo).
// 8. Gerar preview estruturada.
// 9. Restaurar somente após confirmação explícita. Consentimento nunca é ligado automaticamente.

import type {
  CalculationRecord,
  ConfigExportBundle,
  ConfigImportPreview,
  FullBackupBundle,
  FullBackupImportPreview,
  ImportPreview,
  QuarantineSource,
} from '../domain/types'

import { dataManagementError, type DataManagementError } from '../domain/shared/errors'
import { SAFETY_LIMITS } from '../validation/limits'
import {
  configExportBundleSchema,
  fullBackupBundleSchema,
} from '../validation/schemas/data-management'
import { serializedUtf8Bytes } from './bytes'
import { clearStore, putToStore, saveConfigPayload } from './idb'
import { addQuarantineItem } from './quarantine'

export type FileSource =
  | File
  | { name: string; size: number; text: () => Promise<string> }
  | { size?: number; content: string }

export type ImportValidationResult<T extends ImportPreview> =
  | { ok: true; preview: T }
  | { ok: false; error: DataManagementError; details?: string }

// ── Helpers de Invariantes Históricas ─────────────────────────────

function validateHistoricalInvariants(
  history: CalculationRecord[],
): { valid: boolean; error?: string } {
  for (const record of history) {
    if (record.type === 'pharmacokinetics') {
      if (!record.scenarios || record.scenarios.length === 0) {
        return { valid: false, error: 'PK record possui scenarios vazio' }
      }

      const scenarioIds = new Set<string>()
      for (const s of record.scenarios) {
        if (!s.scenarioId || s.scenarioSnapshot.id !== s.scenarioId) {
          return { valid: false, error: 'Incoerência de scenarioId no PK record' }
        }
        if (scenarioIds.has(s.scenarioId)) {
          return { valid: false, error: 'scenarioId duplicado no PK record' }
        }
        scenarioIds.add(s.scenarioId)
      }

      if (!record.chartViewSnapshot || !record.chartViewSnapshot.calendarTimeZone) {
        return { valid: false, error: 'ChartViewSnapshot sem calendarTimeZone' }
      }

      const visualIds = new Set<string>()
      for (const v of record.chartViewSnapshot.displayPointsByScenario) {
        if (visualIds.has(v.scenarioId)) {
          return { valid: false, error: 'Série visual duplicada no ChartViewSnapshot' }
        }
        visualIds.add(v.scenarioId)

        // Validação de pontos
        const scaleMode = record.chartViewSnapshot.scaleMode
        for (const pt of v.points) {
          if (scaleMode === 'absolute' && pt.valueKind !== 'mg') {
            return { valid: false, error: 'Ponto em scaleMode absolute sem valueKind mg' }
          }
          if (scaleMode === 'normalized') {
            if (pt.valueKind !== 'normalized_ratio') {
              return { valid: false, error: 'Ponto em scaleMode normalized sem valueKind normalized_ratio' }
            }
            if (!Number.isFinite(pt.value) || pt.value < 0 || pt.value > 1.000000000001) {
              return { valid: false, error: 'Valor de normalized_ratio fora do intervalo [0, 1]' }
            }
          }
        }
      }

      // Bijeção 1:1 entre cenários e séries visuais
      if (scenarioIds.size !== visualIds.size) {
        return { valid: false, error: 'Cardinalidade científica != cardinalidade visual no PK record' }
      }
      for (const id of scenarioIds) {
        if (!visualIds.has(id)) {
          return { valid: false, error: `Cenário ${id} sem série visual correspondente` }
        }
      }
    } else if (record.type === 'protocol-analysis') {
      const componentKeys = new Set<string>()
      for (const s of record.snapshot.series) {
        const keyStr = `${s.key.protocolId}:${s.key.componentId}`
        if (componentKeys.has(keyStr)) {
          return { valid: false, error: `Chave de protocolo duplicada: ${keyStr}` }
        }
        componentKeys.add(keyStr)
      }

      const inputKeys = new Set<string>()
      for (const inp of record.simulationInputs) {
        const keyStr = `${inp.key.protocolId}:${inp.key.componentId}`
        if (inputKeys.has(keyStr)) {
          return { valid: false, error: `Chave de simulationInput duplicada: ${keyStr}` }
        }
        inputKeys.add(keyStr)
      }

      if (componentKeys.size !== inputKeys.size) {
        return { valid: false, error: 'Bijeção quebrada entre series e simulationInputs em protocol-analysis' }
      }

      for (const k of componentKeys) {
        if (!inputKeys.has(k)) {
          return { valid: false, error: `Série com chave ${k} sem simulationInput correspondente` }
        }
      }
    }
  }
  return { valid: true }
}

// ── Importação de Configurações ──────────────────────────────────

/**
 * Valida um arquivo de configurações (ConfigExportBundle), aplicando a guarda pré-leitura de File.size.
 */
export async function validateAndPreviewConfigImport(
  fileOrSource: FileSource,
): Promise<ImportValidationResult<ConfigImportPreview>> {
  // 1. Guarda pré-leitura: verificar tamanho do arquivo
  let rawText: string
  let declaredSize: number | undefined

  if ('size' in fileOrSource && typeof fileOrSource.size === 'number') {
    declaredSize = fileOrSource.size
    if (fileOrSource.size > SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX) {
      // Rejeita ANTES de ler o arquivo e sem quarentena
      return {
        ok: false,
        error: dataManagementError('IMPORT_FILE_TOO_LARGE', {
          bytes: fileOrSource.size,
          maxBytes: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX,
        }),
      }
    }
  }

  // 2. Leitura
  if ('text' in fileOrSource && typeof fileOrSource.text === 'function') {
    rawText = await fileOrSource.text()
  } else if ('content' in fileOrSource) {
    rawText = fileOrSource.content
  } else {
    return {
      ok: false,
      error: dataManagementError('IMPORT_FILE_TOO_LARGE'),
      details: 'Fonte de arquivo inválida',
    }
  }

  const rawBytes = new TextEncoder().encode(rawText).byteLength
  if (declaredSize === undefined && rawBytes > SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX) {
    return {
      ok: false,
      error: dataManagementError('IMPORT_FILE_TOO_LARGE', {
        bytes: rawBytes,
        maxBytes: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX,
      }),
    }
  }

  // 3. Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch (err) {
    await addQuarantineItem({
      source: 'config_import' as QuarantineSource,
      errorCode: 'INVALID_JSON',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('IMPORT_KIND_MISMATCH'),
      details: `JSON inválido: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // 4. Validar bundleKind
  if (typeof parsed !== 'object' || parsed === null || (parsed as { bundleKind?: unknown }).bundleKind !== 'config') {
    await addQuarantineItem({
      source: 'config_import' as QuarantineSource,
      errorCode: 'IMPORT_KIND_MISMATCH',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('IMPORT_KIND_MISMATCH', {
        expected: 'config',
        received: typeof parsed === 'object' && parsed !== null ? String((parsed as { bundleKind?: unknown }).bundleKind) : 'unknown',
      }),
    }
  }

  // 5. Validar Zod Schema
  const schemaResult = configExportBundleSchema.safeParse(parsed)
  if (!schemaResult.success) {
    await addQuarantineItem({
      source: 'config_import' as QuarantineSource,
      errorCode: 'SCHEMA_VALIDATION_FAILURE',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('IMPORT_KIND_MISMATCH'),
      details: schemaResult.error.message,
    }
  }

  const bundle = schemaResult.data as ConfigExportBundle

  // 6. Validar orçamentos internos
  const payloadBytes = serializedUtf8Bytes(bundle.payload)
  if (payloadBytes > SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX) {
    await addQuarantineItem({
      source: 'config_import' as QuarantineSource,
      errorCode: 'CONFIG_STORAGE_LIMIT_EXCEEDED',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('CONFIG_STORAGE_LIMIT_EXCEEDED', {
        bytes: payloadBytes,
        maxBytes: SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX,
      }),
    }
  }

  const preview: ConfigImportPreview = {
    actionKind: 'config',
    bundleKind: 'config',
    schemaVersion: bundle.schemaVersion,
    datasetVersion: bundle.datasetVersion,
    exportedAt: bundle.exportedAt,
    engineVersions: bundle.engineVersions,
    counts: {
      scenarios: bundle.payload.scenarios.length,
      protocols: bundle.payload.protocols.length,
      recipes: bundle.payload.recipes.length,
      customSubstances: bundle.payload.customSubstances.length,
      customProfiles: bundle.payload.customProfiles.length,
    },
    warnings: [],
    payload: bundle.payload,
  }

  return { ok: true, preview }
}

// ── Importação de Backup Completo ────────────────────────────────

/**
 * Valida um arquivo de backup completo (FullBackupBundle), aplicando a guarda pré-leitura de File.size.
 */
export async function validateAndPreviewFullBackupImport(
  fileOrSource: FileSource,
): Promise<ImportValidationResult<FullBackupImportPreview>> {
  // 1. Guarda pré-leitura
  let rawText: string
  let declaredSize: number | undefined

  if ('size' in fileOrSource && typeof fileOrSource.size === 'number') {
    declaredSize = fileOrSource.size
    if (fileOrSource.size > SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX) {
      return {
        ok: false,
        error: dataManagementError('IMPORT_FILE_TOO_LARGE', {
          bytes: fileOrSource.size,
          maxBytes: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
        }),
      }
    }
  }

  // 2. Leitura
  if ('text' in fileOrSource && typeof fileOrSource.text === 'function') {
    rawText = await fileOrSource.text()
  } else if ('content' in fileOrSource) {
    rawText = fileOrSource.content
  } else {
    return {
      ok: false,
      error: dataManagementError('IMPORT_FILE_TOO_LARGE'),
      details: 'Fonte de arquivo inválida',
    }
  }

  const rawBytes = new TextEncoder().encode(rawText).byteLength
  if (declaredSize === undefined && rawBytes > SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX) {
    return {
      ok: false,
      error: dataManagementError('IMPORT_FILE_TOO_LARGE', {
        bytes: rawBytes,
        maxBytes: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
      }),
    }
  }

  // 3. Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch (err) {
    await addQuarantineItem({
      source: 'full_backup_import' as QuarantineSource,
      errorCode: 'INVALID_JSON',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('IMPORT_KIND_MISMATCH'),
      details: `JSON inválido: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // 4. Validar bundleKind
  if (typeof parsed !== 'object' || parsed === null || (parsed as { bundleKind?: unknown }).bundleKind !== 'full-backup') {
    await addQuarantineItem({
      source: 'full_backup_import' as QuarantineSource,
      errorCode: 'IMPORT_KIND_MISMATCH',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('IMPORT_KIND_MISMATCH', {
        expected: 'full-backup',
        received: typeof parsed === 'object' && parsed !== null ? String((parsed as { bundleKind?: unknown }).bundleKind) : 'unknown',
      }),
    }
  }

  // 5. Validar Zod Schema
  const schemaResult = fullBackupBundleSchema.safeParse(parsed)
  if (!schemaResult.success) {
    await addQuarantineItem({
      source: 'full_backup_import' as QuarantineSource,
      errorCode: 'SCHEMA_VALIDATION_FAILURE',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('IMPORT_KIND_MISMATCH'),
      details: schemaResult.error.message,
    }
  }

  const bundle = schemaResult.data as FullBackupBundle

  // 6. Validar orçamentos internos
  const payloadBytes = serializedUtf8Bytes(bundle.payload)
  if (payloadBytes > SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX) {
    await addQuarantineItem({
      source: 'full_backup_import' as QuarantineSource,
      errorCode: 'CONFIG_STORAGE_LIMIT_EXCEEDED',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('CONFIG_STORAGE_LIMIT_EXCEEDED', {
        bytes: payloadBytes,
        maxBytes: SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX,
      }),
    }
  }

  const historyBytes = serializedUtf8Bytes(bundle.history)
  if (historyBytes > SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX) {
    await addQuarantineItem({
      source: 'full_backup_import' as QuarantineSource,
      errorCode: 'HISTORY_STORAGE_LIMIT_EXCEEDED',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('CONFIG_STORAGE_LIMIT_EXCEEDED', {
        bytes: historyBytes,
        maxBytes: SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX,
      }),
    }
  }

  for (const record of bundle.history) {
    const recBytes = serializedUtf8Bytes(record)
    if (recBytes > SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX) {
      await addQuarantineItem({
        source: 'full_backup_import' as QuarantineSource,
        errorCode: 'CALCULATION_RECORD_TOO_LARGE',
        originalUtf8Bytes: rawBytes,
        rawExcerptUtf8: rawText.slice(0, 4000),
      })
      return {
        ok: false,
        error: dataManagementError('CALCULATION_RECORD_TOO_LARGE', {
          bytes: recBytes,
          maxBytes: SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX,
        }),
      }
    }
  }

  // 7. Validar counts
  if (
    bundle.counts.records !== bundle.history.length ||
    bundle.counts.recipes !== bundle.payload.recipes.length ||
    bundle.counts.scenarios !== bundle.payload.scenarios.length ||
    bundle.counts.protocols !== bundle.payload.protocols.length
  ) {
    await addQuarantineItem({
      source: 'full_backup_import' as QuarantineSource,
      errorCode: 'COUNTS_MISMATCH',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('IMPORT_KIND_MISMATCH'),
      details: 'Inconsistência entre contagens declaradas no backup e registros presentes',
    }
  }

  // 8. Validar invariantes históricas
  const invariantsCheck = validateHistoricalInvariants(bundle.history)
  if (!invariantsCheck.valid) {
    await addQuarantineItem({
      source: 'full_backup_import' as QuarantineSource,
      errorCode: 'HISTORICAL_INVARIANTS_FAILURE',
      originalUtf8Bytes: rawBytes,
      rawExcerptUtf8: rawText.slice(0, 4000),
    })
    return {
      ok: false,
      error: dataManagementError('IMPORT_KIND_MISMATCH'),
      details: invariantsCheck.error,
    }
  }

  const preview: FullBackupImportPreview = {
    actionKind: 'full-backup',
    bundleKind: 'full-backup',
    schemaVersion: bundle.schemaVersion,
    datasetVersion: bundle.datasetVersion,
    exportedAt: bundle.exportedAt,
    engineVersions: bundle.engineVersions,
    counts: bundle.counts,
    historyRecordsCount: bundle.history.length,
    warnings: [],
    bundle,
  }

  return { ok: true, preview }
}

// ── Aplicação / Restauração do Import ────────────────────────────

/**
 * Aplica o conteúdo de uma importação validada e confirmada pelo usuário.
 * Nunca liga nem altera o estado do consentimento de persistência.
 */
export async function applyImport(preview: ImportPreview): Promise<{ ok: true }> {
  if (preview.actionKind === 'config') {
    await saveConfigPayload(preview.payload)
  } else {
    // Restaura configurações
    await saveConfigPayload(preview.bundle.payload)

    // Restaura histórico
    await clearStore('history')
    for (const record of preview.bundle.history) {
      await putToStore('history', record)
    }
  }
  return { ok: true }
}
