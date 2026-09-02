import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, ConfigPayload, Protocol, QuarantineItem, Scenario, StoredHistoryEntry } from '../../domain/types'
import {
  getCalculationRecords,
  getQuarantineItems,
  loadConfigPayload,
} from '../../storage'
import {
  type StoredQuarantineEntry,
  getDefaultFavorites,
  getDefaultSettings,
  resetStorageForTesting,
  resetStorageSessionForTesting,
  setCustomIDBFactoryForTesting,
  setPersistenceConsentForTesting,
} from '../../storage/testing'
import { serializedUtf8Bytes } from '../../storage/bytes'
import { DB_NAME, DB_VERSION } from '../../storage/idb'
import { SAFETY_LIMITS } from '../../validation/limits'
import { readRawStore } from './idb-faults'

async function openRawIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('scenarios')) db.createObjectStore('scenarios', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('protocols')) db.createObjectStore('protocols', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('custom')) db.createObjectStore('custom', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('quarantine')) db.createObjectStore('quarantine', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function createDummyReconRecord(id: string, labelPadding?: string): CalculationRecord {
  return {
    id,
    createdAt: '2026-08-27T08:00:00.000Z',
    display: { title: `Cálculo ${id}`, color: '#2563eb' },
    type: 'reconstitution',
    versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
    input: {
      vialMassMg: 10,
      diluentVolumeMl: 2,
      desiredDoseMcg: 100,
      syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 },
      ...(labelPadding ? { label: labelPadding } : {}),
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
  }
}

function configAtBytes(target: number): ConfigPayload {
  const payload: ConfigPayload = {
    settings: getDefaultSettings(),
    favorites: getDefaultFavorites(),
    customSubstances: [
      {
        id: 'sub-size-target',
        slug: 'sub-size-target',
        name: 'Substância Válida',
        aliases: [''],
        category: 'other',
        tags: [],
        createdAt: '2026-08-27T08:00:00.000Z',
        updatedAt: '2026-08-27T08:00:00.000Z',
      },
    ],
    customProfiles: [],
    recipes: [],
    scenarios: [],
    protocols: [],
  }
  const baseBytes = serializedUtf8Bytes(payload)
  const needed = target - baseBytes
  if (needed > 0) {
    payload.customSubstances[0].aliases = ['A'.repeat(needed)]
  }
  while (serializedUtf8Bytes(payload) < target) {
    payload.customSubstances[0].aliases[0] += 'A'
  }
  while (serializedUtf8Bytes(payload) > target) {
    payload.customSubstances[0].aliases[0] = payload.customSubstances[0].aliases[0].slice(0, -1)
  }
  return payload
}

function recordAtBytes(id: string, target: number): CalculationRecord {
  const record = createDummyReconRecord(id)
  const baseBytes = serializedUtf8Bytes(record)
  const needed = target - baseBytes
  if (needed > 0) {
    record.display.note = 'N'.repeat(needed)
  }
  while (serializedUtf8Bytes(record) < target) {
    record.display.note = (record.display.note || '') + 'N'
  }
  while (serializedUtf8Bytes(record) > target) {
    record.display.note = (record.display.note || '').slice(0, -1)
  }
  return record
}

function quarantineItemAtBytes(id: string, target: number): QuarantineItem {
  const item: QuarantineItem = {
    id,
    createdAt: '2026-08-27T08:00:00.000Z',
    source: 'config_import',
    errorCode: 'ERR_EXACT',
    originalUtf8Bytes: 100,
    rawExcerptUtf8: '',
    truncated: false,
  }
  const baseBytes = serializedUtf8Bytes(item)
  const needed = target - baseBytes
  if (needed > 0) {
    item.rawExcerptUtf8 = 'Q'.repeat(needed)
  }
  while (serializedUtf8Bytes(item) < target) {
    item.rawExcerptUtf8 = (item.rawExcerptUtf8 || '') + 'Q'
  }
  while (serializedUtf8Bytes(item) > target) {
    item.rawExcerptUtf8 = (item.rawExcerptUtf8 || '').slice(0, -1)
  }
  return item
}

async function injectConfigPayloadRaw(db: IDBDatabase, config: ConfigPayload): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['scenarios', 'protocols', 'custom'], 'readwrite')
    const customStore = tx.objectStore('custom')
    customStore.put({ key: 'fk:v1:settings', value: config.settings })
    customStore.put({ key: 'fk:v1:favorites', value: config.favorites })
    customStore.put({ key: 'fk:v1:customSubstances', value: config.customSubstances })
    customStore.put({ key: 'fk:v1:customProfiles', value: config.customProfiles })
    customStore.put({ key: 'fk:v1:recipes', value: config.recipes })

    const scenarioStore = tx.objectStore('scenarios')
    for (const sc of config.scenarios) scenarioStore.put(sc)

    const protocolStore = tx.objectStore('protocols')
    for (const pr of config.protocols) protocolStore.put(pr)

    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => reject(tx.error)
  })
}

describe('Hydration Invariants & Normalization Hardening (§11, §18, E6.4)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsentForTesting(true)
    await resetStorageForTesting()
  })

  it('A: hydration poda quarentena quando existem > 5 envelopes válidos no IDB', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('quarantine', 'readwrite')
    const store = tx.objectStore('quarantine')

    for (let i = 1; i <= 7; i++) {
      const entry: StoredQuarantineEntry = {
        id: `q-raw-${i}`,
        insertionOrder: i,
        item: {
          id: `q-raw-${i}`,
          createdAt: '2026-08-27T08:00:00.000Z',
          source: 'config_import',
          errorCode: `ERR_${i}`,
          originalUtf8Bytes: 100,
          rawExcerptUtf8: `excerpt ${i}`,
          truncated: false,
        },
      }
      store.put(entry)
    }

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    const items = await getQuarantineItems()

    expect(items).toHaveLength(5)
    const errorCodes = items.map((it) => it.errorCode)
    expect(errorCodes).toContain('ERR_7')
    expect(errorCodes).toContain('ERR_3')
    expect(errorCodes).not.toContain('ERR_1')
    expect(errorCodes).not.toContain('ERR_2')
  })

  it('B: hydration poda quarentena quando o total de bytes > 1 MiB', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('quarantine', 'readwrite')
    const store = tx.objectStore('quarantine')

    const largeExcerpt = 'A'.repeat(240 * 1024)
    for (let i = 1; i <= 5; i++) {
      const entry: StoredQuarantineEntry = {
        id: `q-large-${i}`,
        insertionOrder: i,
        item: {
          id: `q-large-${i}`,
          createdAt: '2026-08-27T08:00:00.000Z',
          source: 'config_import',
          errorCode: `ERR_LARGE_${i}`,
          originalUtf8Bytes: 240 * 1024,
          rawExcerptUtf8: largeExcerpt,
          truncated: false,
        },
      }
      store.put(entry)
    }

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    const items = await getQuarantineItems()
    expect(serializedUtf8Bytes(items)).toBeLessThanOrEqual(1024 * 1024)
  })

  it('C: hydration poda histórico se existirem > 500 registros no IDB', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('history', 'readwrite')
    const store = tx.objectStore('history')

    for (let i = 1; i <= 505; i++) {
      const record = createDummyReconRecord(`rec-h-${i}`)
      const entry: StoredHistoryEntry = {
        id: record.id,
        insertionOrder: i,
        record,
      }
      store.put(entry)
    }

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    const history = await getCalculationRecords()
    expect(history).toHaveLength(500)
    expect(history[0].id).toBe('rec-h-505')
    expect(history.some((r) => r.id === 'rec-h-1')).toBe(false)
  })

  it('D e E: insertionOrder duplicados são normalizados e persistidos no IDB', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('history', 'readwrite')
    const store = tx.objectStore('history')

    for (let i = 1; i <= 3; i++) {
      const record = createDummyReconRecord(`rec-dup-order-${i}`)
      const entry: StoredHistoryEntry = {
        id: record.id,
        insertionOrder: 10,
        record,
      }
      store.put(entry)
    }

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    const history = await getCalculationRecords()
    expect(history).toHaveLength(3)

    resetStorageSessionForTesting()
    const historyReloaded = await getCalculationRecords()
    expect(historyReloaded).toHaveLength(3)
  })

  it('F: corrupção de registro no IDB com ID de chave gigantesco gera QuarantineItem com ID compacto próprio', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('scenarios', 'readwrite')
    const store = tx.objectStore('scenarios')

    const hugeId = 'id-giant-' + 'X'.repeat(500_000)
    store.put({ id: hugeId, invalidField: 12345 })

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    await loadConfigPayload()

    const quarantineItems = await getQuarantineItems()
    expect(quarantineItems.length).toBeGreaterThanOrEqual(1)

    const corruptedItem = quarantineItems[0]
    expect(corruptedItem.id.length).toBeLessThan(100)
    expect(serializedUtf8Bytes(corruptedItem)).toBeLessThanOrEqual(256 * 1024)
  })

  it('G: CalculationRecord em 8 MiB exatos é aceito e 8 MiB + 1 é rejeitado na hidratação (§11, E6.5)', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('history', 'readwrite')
    const store = tx.objectStore('history')

    // Registro em 8 MiB exatos
    const recExact = recordAtBytes('rec-8mib-exact', SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX)
    expect(serializedUtf8Bytes(recExact)).toBe(SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX)
    store.put({ id: recExact.id, insertionOrder: 1, record: recExact })

    // Registro em 8 MiB + 1 byte
    const recOversized = recordAtBytes('rec-8mib-plus-1', SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX + 1)
    expect(serializedUtf8Bytes(recOversized)).toBe(SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX + 1)
    store.put({ id: recOversized.id, insertionOrder: 2, record: recOversized })

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    const history = await getCalculationRecords()

    expect(history).toHaveLength(1)
    expect(history[0].id).toBe('rec-8mib-exact')
  })

  it('H: QuarantineItem em 256 KiB exatos é aceito e 256 KiB + 1 é descartado/normalizado (§11, E6.5)', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('quarantine', 'readwrite')
    const store = tx.objectStore('quarantine')

    // Item em 256 KiB exatos
    const itemExact = quarantineItemAtBytes('q-256k-exact', SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX)
    expect(serializedUtf8Bytes(itemExact)).toBe(SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX)
    store.put({ id: itemExact.id, insertionOrder: 1, item: itemExact })

    // Item em 256 KiB + 1 byte
    const itemOversized = quarantineItemAtBytes('q-256k-plus-1', SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX + 1)
    expect(serializedUtf8Bytes(itemOversized)).toBe(SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX + 1)
    store.put({ id: itemOversized.id, insertionOrder: 2, item: itemOversized })

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    const items = await getQuarantineItems()

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('q-256k-exact')
  })

  it('I: ConfigPayload em 15 MiB exatos é aceito na hidratação (§11, E6.5)', async () => {
    const config15Mib = configAtBytes(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX)
    expect(serializedUtf8Bytes(config15Mib)).toBe(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX)

    const db = await openRawIDB()
    await injectConfigPayloadRaw(db, config15Mib)

    resetStorageSessionForTesting()
    const config = await loadConfigPayload()

    expect(config.customSubstances).toHaveLength(1)
    expect(config.customSubstances[0].id).toBe('sub-size-target')
    expect(serializedUtf8Bytes(config)).toBe(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX)

    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(0)
  })

  it('J: ConfigPayload em 15 MiB + 1 byte é sanitizado para defaults seguros (§11, E6.5)', async () => {
    const configOversized = configAtBytes(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX + 1)
    expect(serializedUtf8Bytes(configOversized)).toBe(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX + 1)

    const db = await openRawIDB()
    await injectConfigPayloadRaw(db, configOversized)

    resetStorageSessionForTesting()
    const config = await loadConfigPayload()

    // Reverteu para defaults seguros
    expect(config.customSubstances).toHaveLength(0)
    expect(config.scenarios).toHaveLength(0)

    const quarantine = await getQuarantineItems()
    expect(quarantine.length).toBeGreaterThanOrEqual(1)
  })

  it('K: duas corrupções com mesmo ID original em stores distintas geram IDs únicos na quarentena (§11, E6.4)', async () => {
    const db = await openRawIDB()
    const tx = db.transaction(['scenarios', 'protocols'], 'readwrite')
    tx.objectStore('scenarios').put({ id: 'same-corrupt-id', badField: 1 })
    tx.objectStore('protocols').put({ id: 'same-corrupt-id', badField: 2 })

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    await loadConfigPayload()

    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(2)

    // IDs de quarentena devem ser distintos e nenhum deles deve ser o literal 'same-corrupt-id'
    expect(quarantine[0].id).not.toBe(quarantine[1].id)
    expect(quarantine[0].id).not.toBe('same-corrupt-id')
    expect(quarantine[1].id).not.toBe('same-corrupt-id')
  })

  it('L: corrupções de cenários/protocolos/custom são normalizadas fisicamente e não reaparecem no reload (§11, E6.5)', async () => {
    const validScenario: Scenario = {
      id: 'sc-valid-stay',
      name: 'Cenário Válido Que Fica',
      color: '#2563eb',
      source: { type: 'manual', pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null } },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 43200000, tmaxMs: null },
      doses: [],
    }

    const db = await openRawIDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['scenarios', 'protocols', 'custom'], 'readwrite')
      tx.objectStore('scenarios').put(validScenario)
      tx.objectStore('scenarios').put({ id: 'sc-corrupt-x', invalid: 123 })
      tx.objectStore('protocols').put({ id: 'pr-corrupt-y', invalid: 456 })
      tx.objectStore('custom').put({ key: 'fk:v1:unknown-key-z', value: { bad: true } })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })

    // 1ª hidratação: sanitiza e grava normalização física
    resetStorageSessionForTesting()
    const config1 = await loadConfigPayload()
    expect(config1.scenarios).toHaveLength(1)
    expect(config1.scenarios[0].id).toBe('sc-valid-stay')

    // Verifica que IDB físico foi limpo das entradas corruptas
    const rawScenarios = await readRawStore<Scenario>(indexedDB, 'scenarios')
    expect(rawScenarios).toHaveLength(1)
    expect(rawScenarios[0].id).toBe('sc-valid-stay')

    const rawProtocols = await readRawStore<Protocol>(indexedDB, 'protocols')
    expect(rawProtocols).toHaveLength(0)

    const rawCustom = await readRawStore<{ key: string }>(indexedDB, 'custom')
    expect(rawCustom.some((c) => c.key === 'fk:v1:unknown-key-z')).toBe(false)

    const quarantineBefore = await getQuarantineItems()
    const quarantineIdsBefore = quarantineBefore.map((q) => q.id)
    expect(quarantineIdsBefore.length).toBeGreaterThanOrEqual(1)

    // 2ª hidratação (novo reload/sessão): nenhuma nova corrupção deve ser detectada
    resetStorageSessionForTesting()
    const config2 = await loadConfigPayload()
    expect(config2.scenarios).toHaveLength(1)

    const quarantineAfter = await getQuarantineItems()
    const quarantineIdsAfter = quarantineAfter.map((q) => q.id)
    expect(quarantineIdsAfter).toEqual(quarantineIdsBefore)
  })

  it('M: ConfigPayload > 15 MiB é normalizado fisicamente no IDB e não re-quarentena no reload (§11, E6.5)', async () => {
    const configOversized = configAtBytes(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX + 1)
    const db = await openRawIDB()
    await injectConfigPayloadRaw(db, configOversized)

    // 1ª hidratação
    resetStorageSessionForTesting()
    const config1 = await loadConfigPayload()
    expect(config1.customSubstances).toHaveLength(0)

    // O store custom físico não pode mais conter o array gigante
    const rawCustom = await readRawStore<{ key: string; value: unknown }>(indexedDB, 'custom')
    const substancesEntry = rawCustom.find((c) => c.key === 'fk:v1:customSubstances')
    expect(substancesEntry?.value).toEqual([])

    const quarantineBefore = await getQuarantineItems()
    const quarantineCountBefore = quarantineBefore.length
    expect(quarantineCountBefore).toBeGreaterThanOrEqual(1)

    // 2ª hidratação: quarentena não cresce
    resetStorageSessionForTesting()
    await loadConfigPayload()

    const quarantineAfter = await getQuarantineItems()
    expect(quarantineAfter.length).toBe(quarantineCountBefore)
  })
})
