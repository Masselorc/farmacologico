import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import { setPersistenceConsent } from '../../storage/consent'
import {
  resetStorageForTesting,
  setCustomIDBFactoryForTesting,
} from '../../storage/idb'
import { getCalculationRecords } from '../../storage/history'
import {
  applyImport,
  validateAndPreviewConfigImport,
  validateAndPreviewFullBackupImport,
} from '../../storage/import'
import { getQuarantineItems } from '../../storage/quarantine'
import { paletteColorIdSchema } from '../../validation/schemas/primitives'
import { CURRENT_DATASET_VERSION, ENGINE_VERSIONS } from '../../domain/version'

describe('E9.3 Blocker 1 — Compatibilidade com dados FARMakit v1 anteriores', () => {
  beforeEach(async () => {
    resetStorageForTesting()
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsent(true)
  })

  it('invariante: paletteColorIdSchema NÃO é afrouxado e continua rejeitando aliases nominais', () => {
    expect(paletteColorIdSchema.safeParse('emerald-500').success).toBe(false)
    expect(paletteColorIdSchema.safeParse('blue-500').success).toBe(false)
    expect(paletteColorIdSchema.safeParse('chartreuse-500').success).toBe(false)
    expect(paletteColorIdSchema.safeParse('#059669').success).toBe(true)
    expect(paletteColorIdSchema.safeParse('#2563eb').success).toBe(true)
  })

  it('Caso A: registro real da E8 com emerald-500 no IndexedDB sobrevive à hidratação e normaliza para #059669', async () => {
    // Escreve diretamente no raw IDB antes de qualquer hidratação
    const rawReq = indexedDB.open('farmakit_v1', 1)
    await new Promise<void>((resolve, reject) => {
      rawReq.onupgradeneeded = () => {
        const db = rawReq.result
        if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('quarantine')) db.createObjectStore('quarantine', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('scenarios')) db.createObjectStore('scenarios', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('protocols')) db.createObjectStore('protocols', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('custom')) db.createObjectStore('custom', { keyPath: 'key' })
      }
      rawReq.onsuccess = () => {
        const db = rawReq.result
        const tx = db.transaction('history', 'readwrite')
        const store = tx.objectStore('history')
        store.put({
          id: 'rec-e8-real',
          insertionOrder: 1,
          record: {
            id: 'rec-e8-real',
            createdAt: '2026-08-28T12:00:00.000Z',
            display: {
              title: 'Reconstituição HCG E8',
              color: 'emerald-500', // Emitido pela E8
            },
            type: 'reconstitution',
            versions: {
              reconstitutionEngineVersion: '1.0.0',
              datasetVersion: 1,
            },
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
        })
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }
      rawReq.onerror = () => reject(rawReq.error)
    })

    // Hidrata via getCalculationRecords()
    const history = await getCalculationRecords()
    expect(history).toHaveLength(1)
    expect(history[0].id).toBe('rec-e8-real')
    // Deve ter sido normalizado para o hex canônico da paleta
    expect(history[0].display.color).toBe('#059669')

    // Prova que NÃO foi para a quarentena
    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(0)

    // Prova normalização física no IndexedDB: reabre e confere valor bruto
    interface StoredHistoryRow {
      record: {
        display: {
          color: string
        }
      }
    }
    const checkReq = indexedDB.open('farmakit_v1', 1)
    const rawStored = await new Promise<StoredHistoryRow>((resolve, reject) => {
      checkReq.onsuccess = () => {
        const db = checkReq.result
        const tx = db.transaction('history', 'readonly')
        const getReq = tx.objectStore('history').get('rec-e8-real')
        getReq.onsuccess = () => {
          db.close()
          resolve(getReq.result as StoredHistoryRow)
        }
        getReq.onerror = () => {
          db.close()
          reject(getReq.error)
        }
      }
      checkReq.onerror = () => reject(checkReq.error)
    })

    expect(rawStored.record.display.color).toBe('#059669')
  })

  it('Caso B: FullBackup v1 antigo com aliases históricos importa e canonicaliza para hex', async () => {
    const backupJson = JSON.stringify({
      schemaVersion: 1,
      bundleKind: 'full-backup',
      exportedAt: '2026-08-28T12:00:00.000Z',
      datasetVersion: CURRENT_DATASET_VERSION,
      engineVersions: ENGINE_VERSIONS,
      counts: { records: 1, recipes: 0, scenarios: 1, protocols: 1 },
      payload: {
        settings: { theme: 'system', calendarTimeZone: 'America/Sao_Paulo' },
        favorites: { substances: [], recipeIds: [] },
        customSubstances: [],
        customProfiles: [],
        recipes: [],
        scenarios: [
          {
            id: 'sc-v1-old',
            name: 'Cenário v1',
            color: 'blue-500', // alias histórico v1
            source: { type: 'manual', pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null } },
            displayUnit: 'mg',
            selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
            doses: [],
          },
        ],
        protocols: [
          {
            id: 'proto-v1-old',
            name: 'Protocolo v1',
            createdAt: '2026-08-28T12:00:00.000Z',
            updatedAt: '2026-08-28T12:00:00.000Z',
            totalDoseMg: 100,
            schedule: { startDate: '2026-08-28', localTime: '08:00', timeZone: 'America/Sao_Paulo', recurrence: { type: 'single' } },
            components: [
              {
                id: 'comp-1',
                label: 'C1',
                proportion: 1,
                source: { type: 'manual' },
                selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
                pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
                displayColor: { paletteColor: 'purple-500' }, // alias histórico v1
              },
            ],
          },
        ],
      },
      history: [
        {
          id: 'rec-recon-old',
          createdAt: '2026-08-28T12:00:00.000Z',
          display: {
            title: 'Reconstituição Histórica',
            color: 'emerald-500', // alias histórico v1
          },
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
      ],
    })

    const preview = await validateAndPreviewFullBackupImport({
      name: 'backup.json',
      size: backupJson.length,
      content: backupJson,
    })

    expect(preview.ok).toBe(true)
    if (!preview.ok) return

    expect(preview.preview.bundle.payload.scenarios[0].color).toBe('#2563eb')
    expect(preview.preview.bundle.payload.protocols[0].components[0].displayColor.paletteColor).toBe('#7c3aed')
    expect(preview.preview.bundle.history[0].display.color).toBe('#059669')

    // Aplica e confere se gravou no IDB com hex
    await applyImport(preview.preview)
    const loadedHistory = await getCalculationRecords()
    expect(loadedHistory[0].display.color).toBe('#059669')
  })

  it('Caso C: ConfigExport v1 antigo com alias histórico importa e canonicaliza para hex', async () => {
    const configJson = JSON.stringify({
      schemaVersion: 1,
      bundleKind: 'config',
      exportedAt: '2026-08-28T12:00:00.000Z',
      datasetVersion: CURRENT_DATASET_VERSION,
      engineVersions: ENGINE_VERSIONS,
      payload: {
        settings: { theme: 'system', calendarTimeZone: 'America/Sao_Paulo' },
        favorites: { substances: [], recipeIds: [] },
        customSubstances: [],
        customProfiles: [],
        recipes: [],
        scenarios: [
          {
            id: 'sc-cfg-old',
            name: 'Cenário Config',
            color: 'blue-500', // alias histórico
            source: { type: 'manual', pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null } },
            displayUnit: 'mg',
            selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
            doses: [],
          },
        ],
        protocols: [],
      },
    })

    const preview = await validateAndPreviewConfigImport({
      name: 'config.json',
      size: configJson.length,
      content: configJson,
    })

    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.preview.payload.scenarios[0].color).toBe('#2563eb')
  })

  it('Caso D: cor arbitrária desconhecida NÃO é normalizada e continua sendo rejeitada', async () => {
    const badBackupJson = JSON.stringify({
      schemaVersion: 1,
      bundleKind: 'full-backup',
      exportedAt: '2026-08-28T12:00:00.000Z',
      datasetVersion: CURRENT_DATASET_VERSION,
      engineVersions: ENGINE_VERSIONS,
      counts: { records: 1, recipes: 0, scenarios: 0, protocols: 0 },
      payload: {
        settings: { theme: 'system', calendarTimeZone: 'America/Sao_Paulo' },
        favorites: { substances: [], recipeIds: [] },
        customSubstances: [],
        customProfiles: [],
        recipes: [],
        scenarios: [],
        protocols: [],
      },
      history: [
        {
          id: 'rec-bad',
          createdAt: '2026-08-28T12:00:00.000Z',
          display: {
            title: 'Cor Inválida',
            color: 'chartreuse-500', // cor desconhecida!
          },
          type: 'reconstitution',
          versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
          input: {
            vialMassMg: 5,
            diluentVolumeMl: 2,
            desiredDoseMcg: 250,
            syringe: { family: 'U-100', capacityUnits: 100, markings: 'half_and_single' },
          },
          resultSnapshot: {
            concentrationMcgPerMl: 2500,
            doseVolumeMl: 0.1,
            syringeUnits: 10,
            unitsPerMl: 100,
            theoreticalYieldUnits: 200,
            theoreticalDosesCount: 20,
            warnings: [],
            metadata: { reconstitutionEngineVersion: '1.0.0' },
          },
        },
      ],
    })

    const preview = await validateAndPreviewFullBackupImport({
      name: 'bad-backup.json',
      size: badBackupJson.length,
      content: badBackupJson,
    })

    expect(preview.ok).toBe(false)
  })
})
