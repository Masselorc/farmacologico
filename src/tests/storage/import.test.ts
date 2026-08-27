import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CalculationRecord,
  ConfigExportBundle,
  ConfigPayload,
  FullBackupBundle,
} from '../../domain/types'
import { getPersistenceConsent, setPersistenceConsent } from '../../storage/consent'
import {
  applyImport,
  validateAndPreviewConfigImport,
  validateAndPreviewFullBackupImport,
} from '../../storage/import'
import { getQuarantineItems } from '../../storage/quarantine'
import {
  getAllFromStore,
  loadConfigPayload,
  resetStorageForTesting,
} from '../../storage/idb'
import { CURRENT_DATASET_VERSION, ENGINE_VERSIONS } from '../../domain/version'
import { SAFETY_LIMITS } from '../../validation/limits'

const validConfig: ConfigPayload = {
  settings: { theme: 'system', calendarTimeZone: 'America/Sao_Paulo' },
  favorites: { substances: [], recipeIds: [] },
  customSubstances: [],
  customProfiles: [],
  recipes: [],
  scenarios: [
    {
      id: 'sc-import-1',
      name: 'Cenário Import',
      color: 'blue-500',
      source: { type: 'manual' },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
      doses: [{ id: 'd1', amountMg: 100, time: '2026-08-27T08:00:00.000Z' }],
    },
  ],

  protocols: [],
}

const validConfigBundle: ConfigExportBundle = {
  bundleKind: 'config',
  schemaVersion: 1,
  exportedAt: '2026-08-27T12:00:00Z',
  datasetVersion: CURRENT_DATASET_VERSION,
  engineVersions: ENGINE_VERSIONS,
  payload: validConfig,
}

const validRecord: CalculationRecord = {
  id: 'rec-imp-1',
  createdAt: '2026-08-27T12:00:00Z',
  display: { title: 'Cálculo Import', color: 'blue-500' },
  type: 'reconstitution',
  versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
  input: {
    vialMassMg: 10,
    diluentVolumeMl: 2,
    desiredDoseMcg: 500,
    syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 },
  },
  resultSnapshot: {
    concentrationMcgPerMl: 5000,
    doseVolumeMl: 0.1,
    syringeUnits: 10,
    theoreticalMaxDoses: 20,
    capacityExceeded: false,
    warnings: [],
    metadata: { reconstitutionEngineVersion: '1.0.0' },
  },
}

const validFullBackupBundle: FullBackupBundle = {
  bundleKind: 'full-backup',
  schemaVersion: 1,
  exportedAt: '2026-08-27T12:00:00Z',
  datasetVersion: CURRENT_DATASET_VERSION,
  engineVersions: ENGINE_VERSIONS,
  payload: validConfig,
  history: [validRecord],
  counts: {
    records: 1,
    recipes: 0,
    scenarios: 1,
    protocols: 0,
  },
}

describe('Import Validation & Preview (§11, §16)', () => {
  beforeEach(async () => {
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('guarda pré-leitura: rejeita arquivo acima de 16 MiB em Config SEM chamar .text() e sem quarentenar', async () => {
    const textSpy = vi.fn().mockResolvedValue('{}')
    const mockFile = {
      name: 'large_config.json',
      size: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX + 100,
      text: textSpy,
    }

    const res = await validateAndPreviewConfigImport(mockFile)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('IMPORT_FILE_TOO_LARGE')
    }

    // Prova que text() NUNCA foi chamado
    expect(textSpy).not.toHaveBeenCalled()

    // Prova que NÃO foi copiado para a quarentena
    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(0)
  })

  it('guarda pré-leitura: rejeita arquivo acima de 64 MiB em FullBackup SEM chamar .text() e sem quarentenar', async () => {
    const textSpy = vi.fn().mockResolvedValue('{}')
    const mockFile = {
      name: 'large_backup.json',
      size: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX + 100,
      text: textSpy,
    }

    const res = await validateAndPreviewFullBackupImport(mockFile)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('IMPORT_FILE_TOO_LARGE')
    }

    expect(textSpy).not.toHaveBeenCalled()
    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(0)
  })

  it('detecta kind trocado (config enviado para full-backup ou vice-versa) e registra quarentena', async () => {
    // Envia bundle de config para import de full-backup
    const res = await validateAndPreviewFullBackupImport({
      content: JSON.stringify(validConfigBundle),
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('IMPORT_KIND_MISMATCH')
    }

    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(1)
    expect(quarantine[0].errorCode).toBe('IMPORT_KIND_MISMATCH')
  })

  it('detecta JSON malformado e registra quarentena', async () => {
    const res = await validateAndPreviewConfigImport({
      content: '{"invalido": [1, 2, ',
    })

    expect(res.ok).toBe(false)
    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(1)
    expect(quarantine[0].errorCode).toBe('INVALID_JSON')
  })

  it('detecta counts inconsistentes no FullBackup e rejeita', async () => {
    const badCountsBundle: FullBackupBundle = {
      ...validFullBackupBundle,
      counts: {
        records: 999, // divergente de 1
        recipes: 0,
        scenarios: 1,
        protocols: 0,
      },
    }

    const res = await validateAndPreviewFullBackupImport({
      content: JSON.stringify(badCountsBundle),
    })

    expect(res.ok).toBe(false)
    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(1)
    expect(quarantine[0].errorCode).toBe('COUNTS_MISMATCH')
  })

  it('valida com sucesso Config correto e gera preview estruturada', async () => {
    const res = await validateAndPreviewConfigImport({
      content: JSON.stringify(validConfigBundle),
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.preview.actionKind).toBe('config')
      expect(res.preview.counts.scenarios).toBe(1)
      expect(res.preview.payload.scenarios[0].name).toBe('Cenário Import')
    }
  })

  it('applyImport restaura os dados e NUNCA altera o consentimento de persistência', async () => {
    // Deixa consentimento desativado inicialmente
    setPersistenceConsent(false)

    const res = await validateAndPreviewFullBackupImport({
      content: JSON.stringify(validFullBackupBundle),
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      await applyImport(res.preview)
    }

    // Consentimento permanece false
    expect(getPersistenceConsent()).toBe(false)

    // Dados foram restaurados na sessão
    const loaded = await loadConfigPayload()
    expect(loaded.scenarios[0].id).toBe('sc-import-1')

    const history = await getAllFromStore<CalculationRecord>('history')
    expect(history).toHaveLength(1)
    expect(history[0].id).toBe('rec-imp-1')
  })
})
