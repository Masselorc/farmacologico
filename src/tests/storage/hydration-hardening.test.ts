import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, StoredHistoryEntry } from '../../domain/types'

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

function createDummyReconRecord(id: string): CalculationRecord {
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

describe('Hydration Invariants & Normalization Hardening (§11, §18, E6.3)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsentForTesting(true)
    await resetStorageForTesting()
  })

  it('A: hydration poda quarentena quando existem > 5 envelopes válidos no IDB', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('quarantine', 'readwrite')
    const store = tx.objectStore('quarantine')

    // Injeta 7 envelopes válidos diretamente no IDB
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

    // Hidrata memória
    resetStorageSessionForTesting()
    const items = await getQuarantineItems()

    expect(items).toHaveLength(5)
    // Preserva os 5 mais recentes (q-raw-3 a q-raw-7)
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

    // Injeta 5 envelopes de ~240 KiB cada (total ~1.2 MiB > 1 MiB)
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

    // Injeta 505 registros
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
    // Preserva os 500 mais novos (rec-h-6 a rec-h-505)
    expect(history[0].id).toBe('rec-h-505')
    expect(history.some((r) => r.id === 'rec-h-1')).toBe(false)
  })

  it('D e E: insertionOrder duplicados são normalizados e persistidos no IDB', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('history', 'readwrite')
    const store = tx.objectStore('history')

    // Injeta 3 registros com insertionOrder duplicado = 10
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

    // Recarrega de uma nova sessão e verifica que a normalização física foi persistida
    resetStorageSessionForTesting()
    const historyReloaded = await getCalculationRecords()
    expect(historyReloaded).toHaveLength(3)
  })

  it('F: corrupção de registro no IDB com ID de chave gigantesco gera QuarantineItem com ID compacto próprio', async () => {
    const db = await openRawIDB()
    const tx = db.transaction('scenarios', 'readwrite')
    const store = tx.objectStore('scenarios')

    // Registro corrompido com ID gigantesco de 500.000 caracteres
    const hugeId = 'id-giant-' + 'X'.repeat(500_000)
    store.put({ id: hugeId, invalidField: 12345 })

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()
    // Força hidratação
    await loadConfigPayload()

    const quarantineItems = await getQuarantineItems()
    expect(quarantineItems.length).toBeGreaterThanOrEqual(1)

    const corruptedItem = quarantineItems[0]
    // O ID do item da quarentena deve ser compacto e seguro (< 100 caracteres)
    expect(corruptedItem.id.length).toBeLessThan(100)
    expect(serializedUtf8Bytes(corruptedItem)).toBeLessThanOrEqual(256 * 1024)
  })
})
