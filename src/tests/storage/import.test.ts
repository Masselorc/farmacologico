import { beforeEach, describe, expect, it, vi } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { FullBackupBundle, Protocol } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import { buildConfigExport, buildFullBackup } from '../../storage/export'
import { getCalculationRecords } from '../../storage/history'
import {
  getDefaultFavorites,
  getDefaultSettings,
  loadConfigPayload,
  resetStorageForTesting,
  setCustomIDBFactoryForTesting,
} from '../../storage/idb'
import {
  applyImport,
  validateAndPreviewConfigImport,
  validateAndPreviewFullBackupImport,
} from '../../storage/import'
import { getQuarantineItems } from '../../storage/quarantine'
import { SAFETY_LIMITS } from '../../validation/limits'

const baseConfig = {
  settings: getDefaultSettings(),
  favorites: getDefaultFavorites(),
  customSubstances: [],
  customProfiles: [],
  recipes: [],
  scenarios: [],
  protocols: [],
}

const validProtocolSnapshot: Protocol = {
  id: 'proto:1',
  name: 'Protocolo com : no ID',
  totalDoseMg: 100,
  schedule: {
    startDate: '2026-08-27',
    localTime: '08:00',
    timeZone: 'America/Sao_Paulo',
    recurrence: { type: 'single' },
  },
  components: [
    {
      id: 'comp:1',
      label: 'Componente 1',
      proportion: 1,
      source: { type: 'manual' },
      selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
      pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
      displayColor: { paletteColor: 'blue-500' },
    },
  ],

  createdAt: '2026-08-27T08:00:00.000Z',
  updatedAt: '2026-08-27T08:00:00.000Z',
}


describe('Import Pipeline, Guards & Invariants (§11, §16, §17, E6.1)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('CORREÇÃO 15: guarda pré-leitura de File.size não chama text() nem arrayBuffer() e não quarentena', async () => {
    const textSpy = vi.fn().mockResolvedValue('{}')
    const arrayBufferSpy = vi.fn().mockResolvedValue(new ArrayBuffer(0))

    const mockOversizedFile = {
      name: 'huge-backup.json',
      size: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX + 1, // 64 MiB + 1
      text: textSpy,
      arrayBuffer: arrayBufferSpy,
    }

    const res = await validateAndPreviewFullBackupImport(mockOversizedFile)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('IMPORT_FILE_TOO_LARGE')
    }

    // Prova de que NENHUMA leitura do arquivo foi executada
    expect(textSpy).not.toHaveBeenCalled()
    expect(arrayBufferSpy).not.toHaveBeenCalled()

    // Prova de que NÃO foi enviado para quarentena
    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(0)
  })

  it('rejeita e quarentena JSON inválido ou malformado', async () => {
    const invalidJsonFile = {
      name: 'corrupt.json',
      size: 15,
      content: '{ invalid json ',
    }

    const res = await validateAndPreviewConfigImport(invalidJsonFile)
    expect(res.ok).toBe(false)

    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(1)
    expect(quarantine[0].source).toBe('config_import')
    expect(quarantine[0].errorCode).toBe('INVALID_JSON')
  })

  it('rejeita com IMPORT_KIND_MISMATCH quando a ação pretendida não coincide com bundleKind', async () => {
    const configExport = buildConfigExport(baseConfig)
    expect(configExport.ok).toBe(true)
    if (!configExport.ok) return

    // Tenta importar ConfigExportBundle através da ação FullBackup
    const res = await validateAndPreviewFullBackupImport({
      name: 'config-disguised.json',
      content: configExport.json,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('IMPORT_KIND_MISMATCH')
    }
  })

  it('CORREÇÃO 5: valida invariants de protocol-analysis (chaves, 1:1, IDs com dois pontos e unicidade)', async () => {
    const validFullBackup = buildFullBackup(baseConfig, [
      {
        id: 'rec-proto-1',
        createdAt: '2026-08-27T08:00:00.000Z',
        display: { title: 'Análise Protocolo', color: 'blue-500' },
        type: 'protocol-analysis',
        versions: {
          pkEngineVersion: '1.0.0',
          recurrenceEngineVersion: '1.0.0',
          datasetVersion: 1,
        },
        timeZone: 'America/Sao_Paulo',
        protocolsSnapshot: [validProtocolSnapshot],
        snapshot: {
          displayWindow: { startMs: 0, endMs: 86400000 },
          calculationWindow: { startMs: 0, endMs: 86400000 },
          series: [
            {
              key: { protocolId: 'proto:1', componentId: 'comp:1' },
              label: 'Série 1',
              color: 'blue-500',
              displayPoints: [{ timeMs: 0, amountMg: 100, clippedBelowLogEpsilon: false }],
              state: {
                administeredMg: 100,
                centralMg: 100,
                depotMg: 0,
                eliminatedMg: 0,
                administeredCount: 1,
                plannedCount: 1,
                centralPercent: 100,
                depotPercent: 0,
                eliminatedPercent: 0,
              },
              peak: { timeMs: 0, amountMg: 100 },
              milestones: [{ percentage: 50, targetMg: 50, timeMs: 86400000 }],
              warnings: [],
            },
          ],
        },
        simulationInputs: [
          {
            key: { protocolId: 'proto:1', componentId: 'comp:1' },
            input: {
              halfLifeMs: 86400000,
              tmaxMs: null,
              doses: [{ id: 'd1', amountMg: 100, timeMs: 0 }],
              nowMs: 0,
            },
          },
        ],
      },
    ])

    expect(validFullBackup.ok).toBe(true)
    if (!validFullBackup.ok) return

    const previewRes = await validateAndPreviewFullBackupImport({
      name: 'valid-backup.json',
      content: validFullBackup.json,
    })

    expect(previewRes.ok).toBe(true)
  })


  it('CORREÇÃO 5: rejeita protocol-analysis com chave órfã não presente em protocolsSnapshot', async () => {
    const invalidProtoBackup: FullBackupBundle = {
      bundleKind: 'full-backup',
      schemaVersion: 1,
      exportedAt: '2026-08-27T08:00:00.000Z',
      datasetVersion: 1,
      engineVersions: { pk: '1.0.0', recurrence: '1.0.0', reconstitution: '1.0.0' },
      payload: baseConfig,
      history: [
        {
          id: 'rec-orphan-key',
          createdAt: '2026-08-27T08:00:00.000Z',
          display: { title: 'Análise Órfã', color: 'blue-500' },
          type: 'protocol-analysis',
          versions: { pkEngineVersion: '1.0.0', recurrenceEngineVersion: '1.0.0', datasetVersion: 1 },
          timeZone: 'UTC',
          protocolsSnapshot: [validProtocolSnapshot],
          snapshot: {
            displayWindow: { startMs: 0, endMs: 86400000 },
            calculationWindow: { startMs: 0, endMs: 86400000 },
            series: [
              {
                key: { protocolId: 'proto:1', componentId: 'comp-NON-EXISTENT' }, // Órfão!
                label: 'Série',
                color: 'blue-500',
                displayPoints: [],
                state: { administeredMg: 0, centralMg: 0, depotMg: 0, eliminatedMg: 0, administeredCount: 0, plannedCount: 0, centralPercent: 0, depotPercent: 0, eliminatedPercent: 0 },
                peak: { timeMs: 0, amountMg: 0 },
                milestones: [],
                warnings: [],
              },
            ],
          },
          simulationInputs: [
            {
              key: { protocolId: 'proto:1', componentId: 'comp-NON-EXISTENT' },
              input: { halfLifeMs: 43200000, tmaxMs: null, doses: [], nowMs: 0 },
            },
          ],
        },
      ],
      counts: { records: 1, recipes: 0, scenarios: 0, protocols: 0 },
    }

    const previewRes = await validateAndPreviewFullBackupImport({
      name: 'orphan-proto-backup.json',
      content: JSON.stringify(invalidProtoBackup),
    })

    expect(previewRes.ok).toBe(false)
  })

  it('CORREÇÃO 11: applyImport aplica as configurações e o histórico', async () => {
    const backup = buildFullBackup(baseConfig, [
      {
        id: 'rec-applied',
        createdAt: '2026-08-27T08:00:00.000Z',
        display: { title: 'Applied Rec', color: 'blue-500' },
        type: 'reconstitution',
        versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
        input: {
          vialMassMg: 10,
          diluentVolumeMl: 2,
          desiredDoseMcg: 100,
          syringe: {
            family: 'U-100',
            capacityUnits: 100,
            unitsPerMl: 100,
            graduationUnits: 1,
          },
        },
        resultSnapshot: {
          concentrationMcgPerMl: 5000,
          doseVolumeMl: 0.02,
          syringeUnits: 2,
          theoreticalMaxDoses: 100,
          capacityExceeded: false,
          warnings: [],
          metadata: { reconstitutionEngineVersion: '1.0.0' },
        },
      },
    ])

    expect(backup.ok).toBe(true)
    if (!backup.ok) return

    const previewRes = await validateAndPreviewFullBackupImport({
      name: 'apply-test.json',
      content: backup.json,
    })

    expect(previewRes.ok).toBe(true)
    if (!previewRes.ok) return

    await applyImport(previewRes.preview)

    const history = await getCalculationRecords()
    expect(history).toHaveLength(1)
    expect(history[0].id).toBe('rec-applied')
  })

  it('TOCTOU Config: mutações em preview após applyImport não afetam o payload gravado (§11, E6.5)', async () => {
    const originalConfig = {
      ...baseConfig,
      settings: { ...getDefaultSettings(), theme: 'system' as const },
      scenarios: [
        {
          id: 'sc-orig-1',
          name: 'Cenário Original',
          color: 'blue-500',
          source: { type: 'manual' as const, pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' as const }, tmax: null } },
          displayUnit: 'mg' as const,
          selectedPkParameters: { halfLifeMs: 43200000, tmaxMs: null },
          doses: [],
        },
      ],
    }

    const configExport = buildConfigExport(originalConfig)
    expect(configExport.ok).toBe(true)
    if (!configExport.ok) return

    const previewRes = await validateAndPreviewConfigImport({
      name: 'config-orig.json',
      content: configExport.json,
    })
    expect(previewRes.ok).toBe(true)
    if (!previewRes.ok) return

    const preview = previewRes.preview
    const promise = applyImport(preview)

    // Modificações síncronas imediatas estruturalmente válidas antes do await
    preview.payload.settings.theme = 'dark'
    preview.payload.scenarios[0].name = 'NOME_ALTERADO_DEPOIS_DA_CHAMADA'

    await promise

    const loaded = await loadConfigPayload()
    expect(loaded.settings.theme).toBe('system')
    expect(loaded.scenarios[0].name).toBe('Cenário Original')
  })

  it('TOCTOU FullBackup: mutações em preview após applyImport não afetam o backup gravado (§11, E6.5)', async () => {
    const originalBackup = buildFullBackup(
      {
        ...baseConfig,
        settings: { ...getDefaultSettings(), theme: 'system' as const },
      },
      [
        {
          id: 'rec-orig-1',
          createdAt: '2026-08-27T08:00:00.000Z',
          display: { title: 'Título Original', color: 'blue-500' },
          type: 'reconstitution',
          versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
          input: {
            vialMassMg: 10,
            diluentVolumeMl: 2,
            desiredDoseMcg: 100,
            syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 },
          },
          resultSnapshot: {
            concentrationMcgPerMl: 5000,
            doseVolumeMl: 0.02,
            syringeUnits: 2,
            theoreticalMaxDoses: 100,
            capacityExceeded: false,
            warnings: [],
            metadata: { reconstitutionEngineVersion: '1.0.0' },
          },
        },
      ],
    )

    expect(originalBackup.ok).toBe(true)
    if (!originalBackup.ok) return

    const previewRes = await validateAndPreviewFullBackupImport({
      name: 'fullbackup-orig.json',
      content: originalBackup.json,
    })
    expect(previewRes.ok).toBe(true)
    if (!previewRes.ok) return

    const preview = previewRes.preview
    const promise = applyImport(preview)

    // Modificações síncronas imediatas antes do await
    preview.bundle.payload.settings.theme = 'dark'
    preview.bundle.history[0].display.title = 'TITULO_ALTERADO_DEPOIS_DA_CHAMADA'

    await promise

    const loadedConfig = await loadConfigPayload()
    expect(loadedConfig.settings.theme).toBe('system')

    const loadedHistory = await getCalculationRecords()
    expect(loadedHistory[0].display.title).toBe('Título Original')
  })
})
