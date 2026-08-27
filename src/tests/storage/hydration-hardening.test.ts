import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, Scenario, StoredHistoryEntry } from '../../domain/types'
import {
  getCalculationRecords,
  getQuarantineItems,
  loadConfigPayload,
} from '../../storage'
import {
  type StoredQuarantineEntry,
  resetStorageForTesting,
  resetStorageSessionForTesting,
  setCustomIDBFactoryForTesting,
  setPersistenceConsentForTesting,
} from '../../storage/testing'
import { serializedUtf8Bytes } from '../../storage/bytes'
import { DB_NAME, DB_VERSION } from '../../storage/idb'
import { SAFETY_LIMITS } from '../../validation/limits'

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
    display: { title: `Cálculo ${id}`, color: 'blue-500' },
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

  it('G: CalculationRecord > 8 MiB na hidratação é rejeitado e não entra no histórico ativo (§11, E6.4)', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('history', 'readwrite')
    const store = tx.objectStore('history')

    // Registro válido pequeno
    const recSmall = createDummyReconRecord('rec-small')
    store.put({ id: recSmall.id, insertionOrder: 1, record: recSmall })

    // Registro com > 8 MiB (8.5 MiB)
    const padding = 'Z'.repeat(8.5 * 1024 * 1024)
    const recGiant = createDummyReconRecord('rec-giant', padding)
    store.put({ id: recGiant.id, insertionOrder: 2, record: recGiant })

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    const history = await getCalculationRecords()

    expect(history).toHaveLength(1)
    expect(history[0].id).toBe('rec-small')
  })

  it('H: QuarantineItem > 256 KiB na hidratação é descartado/normalizado da quarentena (§11, E6.4)', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('quarantine', 'readwrite')
    const store = tx.objectStore('quarantine')

    // Item válido pequeno (10 KiB)
    const validEntry: StoredQuarantineEntry = {
      id: 'q-valid-small',
      insertionOrder: 1,
      item: {
        id: 'q-valid-small',
        createdAt: '2026-08-27T08:00:00.000Z',
        source: 'config_import',
        errorCode: 'ERR_SMALL',
        originalUtf8Bytes: 10 * 1024,
        rawExcerptUtf8: 'X'.repeat(10 * 1024),
        truncated: false,
      },
    }
    store.put(validEntry)

    // Item que excede 256 KiB (300 KiB)
    const giantEntry = {
      id: 'q-giant',
      insertionOrder: 2,
      item: {
        id: 'q-giant',
        createdAt: '2026-08-27T08:00:00.000Z',
        source: 'config_import',
        errorCode: 'ERR_GIANT',
        originalUtf8Bytes: 300 * 1024,
        rawExcerptUtf8: 'Y'.repeat(300 * 1024),
        truncated: false,
      },
    }
    store.put(giantEntry)

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    const items = await getQuarantineItems()

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('q-valid-small')
  })

  it('I: ConfigPayload > 15 MiB na hidratação não é publicado e reverte para defaults seguros (§11, E6.4)', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('scenarios', 'readwrite')
    const store = tx.objectStore('scenarios')

    // Injeta cenário com doses suficientes para exceder 15 MiB
    const largeDoses = Array.from({ length: 350_000 }, (_, i) => ({
      id: `d-${i}`,
      amountMg: 50,
      time: '2026-08-27T08:00:00.000Z',
    }))
    const hugeScenario: Scenario = {
      id: 'sc-giant',
      name: 'Giant Scenario',
      color: 'blue-500',
      source: {
        type: 'manual',
        pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null },
      },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 43200000, tmaxMs: null },
      doses: largeDoses,
    }
    expect(serializedUtf8Bytes(hugeScenario)).toBeGreaterThan(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX)
    store.put(hugeScenario)

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    const config = await loadConfigPayload()

    // Config reverteu para defaults seguros vazios
    expect(config.scenarios).toHaveLength(0)
    expect(config.protocols).toHaveLength(0)

    // Corrupção foi registrada na quarentena
    const quarantine = await getQuarantineItems()
    expect(quarantine.length).toBeGreaterThanOrEqual(1)
  })

  it('J: duas corrupções com mesmo ID original em stores distintas geram IDs únicos na quarentena sem colidir (§11, E6.4)', async () => {
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
})
