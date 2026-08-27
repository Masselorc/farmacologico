import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { AppSettings, Scenario } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import {
  DB_NAME,
  DB_VERSION,
  getAllFromStore,
  getFromStore,
  loadConfigPayload,
  resetStorageForTesting,
  setCustomIDBFactoryForTesting,
} from '../../storage/idb'
import { getQuarantineItems } from '../../storage/quarantine'
import { serializedUtf8Bytes } from '../../storage/bytes'
import { SAFETY_LIMITS } from '../../validation/limits'

async function openRawIDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
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

describe('IDB Read-Validation & Corruption Quarantine (§11, E6.1)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('CORREÇÃO 7: detecta cenário corrompido no IDB, descarta e envia para quarentena idb_corruption', async () => {
    // 1. Injeta diretamente no IDB um objeto cenário inválido (sem doses válidas / displayUnit inválida)
    const rawCorruptScenario = {
      id: 'sc-corrupt-1',
      name: 'Cenário Corrompido',
      color: 'invalid-color',
      displayUnit: 'litros', // Inválido no schema
      doses: [{ id: 'd1', amountMg: -50 }], // Inválido (dose negativa)
    }

    const db = await openRawIDB()

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('scenarios', 'readwrite')
      tx.objectStore('scenarios').put(rawCorruptScenario)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })

    // 2. Lê os cenários através da camada de storage
    const scenarios = await getAllFromStore<Scenario>('scenarios')
    // O cenário corrompido NÃO deve ser retornado como válido
    expect(scenarios).toHaveLength(0)

    const singleFetch = await getFromStore<Scenario>('scenarios', 'sc-corrupt-1')
    expect(singleFetch).toBeUndefined()

    // 3. Verifica se foi gerado item de quarentena com source='idb_corruption'
    const quarantine = await getQuarantineItems()
    expect(quarantine.length).toBeGreaterThanOrEqual(1)
    const corruptItem = quarantine.find((q) => q.source === 'idb_corruption')
    expect(corruptItem).toBeDefined()
    expect(corruptItem?.errorCode).toContain('IDB_CORRUPTED_ENTRY_SCENARIOS')
  })

  it('CORREÇÃO 7: detecta settings corrompido no custom store, faz fallback seguro e quarentena', async () => {
    const rawCorruptSettings = {
      theme: 'neon-green', // Inválido (apenas 'system'|'light'|'dark')
      calendarTimeZone: 'Invalid/Zone',
    }

    const db = await openRawIDB()

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('custom', 'readwrite')
      tx.objectStore('custom').put({ key: 'fk:v1:settings', value: rawCorruptSettings })
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })

    // Lê configurações através do helper de alto nível
    const config = await loadConfigPayload()
    expect(config.settings.theme).toBe('system') // Fallback default seguro

    const settings = await getFromStore<AppSettings>('custom', 'fk:v1:settings')
    expect(settings?.theme).toBe('system')

    const quarantine = await getQuarantineItems()
    expect(quarantine.some((q) => q.source === 'idb_corruption')).toBe(true)
  })

  it('CORREÇÃO 7: corrupção no próprio store quarantine não causa recursão infinita', async () => {
    const rawCorruptQuarantine = {
      id: 'q-corrupt-recursive',
      source: 'invalid_source',
      errorCode: 12345, // Inválido (esperado string)
    }

    const db = await openRawIDB()

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('quarantine', 'readwrite')
      tx.objectStore('quarantine').put(rawCorruptQuarantine)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })

    // A leitura de quarentena deve ignorar o item corrompido sem disparar nova inserção
    const items = await getQuarantineItems()
    expect(items.find((i) => i.id === 'q-corrupt-recursive')).toBeUndefined()
  })

  it('valida customSubstances, customProfiles e recipes como coleções completas', async () => {
    const db = await openRawIDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('custom', 'readwrite')
      tx.objectStore('custom').put({ key: 'fk:v1:customSubstances', value: [{ id: 123 }] })
      tx.objectStore('custom').put({ key: 'fk:v1:customProfiles', value: [{ id: 'p', owner: null }] })
      tx.objectStore('custom').put({ key: 'fk:v1:recipes', value: [{ id: 'r', input: 'invalid' }] })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })

    const config = await loadConfigPayload()
    expect(config.customSubstances).toEqual([])
    expect(config.customProfiles).toEqual([])
    expect(config.recipes).toEqual([])
    const quarantine = await getQuarantineItems()
    expect(quarantine.filter((item) => item.source === 'idb_corruption')).toHaveLength(3)
  })

  it('submete muitas corrupções IDB à política global de 5 itens e budgets', async () => {
    const db = await openRawIDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('scenarios', 'readwrite')
      for (let index = 0; index < 10; index += 1) {
        tx.objectStore('scenarios').put({ id: `corrupt-${index}`, invalid: 'x'.repeat(300_000) })
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })

    expect(await getAllFromStore<Scenario>('scenarios')).toEqual([])
    const items = await getQuarantineItems()
    expect(items.length).toBeLessThanOrEqual(SAFETY_LIMITS.QUARANTINE_ITEMS_MAX)
    expect(serializedUtf8Bytes(items)).toBeLessThanOrEqual(SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX)
    expect(items.every((item) => serializedUtf8Bytes(item) <= SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX)).toBe(true)
    expect(items.some((item) => item.source === 'idb_corruption' && item.rawExcerptUtf8?.includes('corrupt-9'))).toBe(true)
  })

  it('valida referências cruzadas ao montar o ConfigPayload lido', async () => {
    const db = await openRawIDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('scenarios', 'readwrite')
      tx.objectStore('scenarios').put({
        id: 'orphan-read', name: 'Órfão', color: 'blue-500', displayUnit: 'mg', doses: [],
        selectedPkParameters: { halfLifeMs: 43_200_000, tmaxMs: null },
        source: { type: 'custom_profile', customProfileId: 'missing',
          pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null } },
      })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })
    expect((await loadConfigPayload()).scenarios).toEqual([])
    expect((await getQuarantineItems()).some((item) => item.source === 'idb_corruption')).toBe(true)
  })
})
