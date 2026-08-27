// Infraestrutura de armazenamento IndexedDB com degradação resiliente em memória (§11).
// Stores normativos: scenarios | protocols | history | custom | quarantine.
// Chaves/namespaces: fk:v1:*.

import type {
  AppSettings,
  CalculationRecord,
  ConfigPayload,
  CustomProfile,
  CustomSubstance,
  Favorites,
  Protocol,
  QuarantineItem,
  ReconstitutionRecipe,
  Scenario,
} from '../domain/types'
import { getPersistenceConsent } from './consent'

export const DB_NAME = 'farmakit_v1'
export const DB_VERSION = 1

export type StoreName = 'scenarios' | 'protocols' | 'history' | 'custom' | 'quarantine'

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  calendarTimeZone: 'America/Sao_Paulo',
}

const DEFAULT_FAVORITES: Favorites = {
  substances: [],
  recipeIds: [],
}

interface CustomEntry {
  key: string
  value: unknown
}

// ── Estado de Degradação / Falha ─────────────────────────────────

let isDegradedState = false
let lastStorageError: Error | null = null
let simulatedFailure: Error | null = null

// Store em memória para modo degradado ou quando IndexedDB não está disponível / consentimento off
class InMemoryStore {
  scenarios = new Map<string, Scenario>()
  protocols = new Map<string, Protocol>()
  history = new Map<string, CalculationRecord>()
  custom = new Map<string, unknown>()
  quarantine = new Map<string, QuarantineItem>()

  constructor() {
    this.custom.set('fk:v1:settings', DEFAULT_SETTINGS)
    this.custom.set('fk:v1:favorites', DEFAULT_FAVORITES)
    this.custom.set('fk:v1:customSubstances', [])
    this.custom.set('fk:v1:customProfiles', [])
    this.custom.set('fk:v1:recipes', [])
  }

  clearAll() {
    this.scenarios.clear()
    this.protocols.clear()
    this.history.clear()
    this.quarantine.clear()
    this.custom.clear()
    this.custom.set('fk:v1:settings', DEFAULT_SETTINGS)
    this.custom.set('fk:v1:favorites', DEFAULT_FAVORITES)
    this.custom.set('fk:v1:customSubstances', [])
    this.custom.set('fk:v1:customProfiles', [])
    this.custom.set('fk:v1:recipes', [])
  }
}

const inMemory = new InMemoryStore()

/**
 * Informa se o armazenamento persistente está em estado degradado (operando em memória).
 */
export function isStorageDegraded(): boolean {
  return isDegradedState
}

/**
 * Retorna o último erro ocorrido no IndexedDB, se houver.
 */
export function getLastStorageError(): Error | null {
  return lastStorageError
}

/**
 * Permite simular falhas de IndexedDB durante testes.
 */
export function simulateIDBFailure(enabled: boolean, error?: Error): void {
  simulatedFailure = enabled ? error || new Error('Simulated IDB Failure') : null
  if (enabled) {
    isDegradedState = true
    lastStorageError = simulatedFailure
  }
}

let customIDBFactory: IDBFactory | undefined = undefined

export function setCustomIDBFactoryForTesting(factory: IDBFactory | undefined): void {
  customIDBFactory = factory
}

export function createMockIDBFactory(): IDBFactory {

  const storeData = new Map<string, Map<string, unknown>>()
  const objectStoreNames = new Set<string>()

  const triggerSuccess = (req: Record<string, unknown>) => {
    const handler = req.onsuccess as ((e: unknown) => void) | null | undefined
    if (handler) {
      handler.call(req, { target: req })
    }
  }

  const triggerComplete = (tx: Record<string, unknown>) => {
    const handler = tx.oncomplete as ((e: unknown) => void) | null | undefined
    if (handler) {
      handler.call(tx, { target: tx })
    }
  }

  const triggerUpgrade = (req: Record<string, unknown>) => {
    const handler = req.onupgradeneeded as ((e: unknown) => void) | null | undefined
    if (handler) {
      handler.call(req, { target: req })
    }
  }

  const db: Partial<IDBDatabase> = {
    objectStoreNames: {
      contains: (name: string) => objectStoreNames.has(name),
    } as unknown as DOMStringList,
    createObjectStore: (name: string) => {
      objectStoreNames.add(name)
      if (!storeData.has(name)) {
        storeData.set(name, new Map())
      }
      return {} as IDBObjectStore
    },
    transaction: () => {
      const tx: Record<string, unknown> = {
        error: null,
        oncomplete: null,
        onerror: null,
        objectStore: (name: string) => {
          let map = storeData.get(name)
          if (!map) {
            map = new Map()
            storeData.set(name, map)
          }
          return {
            getAll: () => {
              const req: Record<string, unknown> = { result: Array.from(map.values()), onsuccess: null, onerror: null }
              queueMicrotask(() => triggerSuccess(req))
              return req as unknown as IDBRequest
            },
            get: (key: string) => {
              const req: Record<string, unknown> = { result: map.get(key), onsuccess: null, onerror: null }
              queueMicrotask(() => triggerSuccess(req))
              return req as unknown as IDBRequest
            },
            put: (value: unknown) => {
              const key = (value as { key?: string; id?: string }).key || (value as { id?: string }).id || 'k'
              map.set(key, value)
              const req: Record<string, unknown> = { onsuccess: null, onerror: null }
              queueMicrotask(() => triggerSuccess(req))
              return req as unknown as IDBRequest
            },
            delete: (key: string) => {
              map.delete(key)
              const req: Record<string, unknown> = { onsuccess: null, onerror: null }
              queueMicrotask(() => triggerSuccess(req))
              return req as unknown as IDBRequest
            },
            clear: () => {
              map.clear()
              const req: Record<string, unknown> = { onsuccess: null, onerror: null }
              queueMicrotask(() => triggerSuccess(req))
              return req as unknown as IDBRequest
            },
          } as unknown as IDBObjectStore
        },
      }
      queueMicrotask(() => triggerComplete(tx))
      return tx as unknown as IDBTransaction
    },
    close: () => {},
  }

  const factory: Record<string, unknown> = {
    open: () => {
      const req: Record<string, unknown> = {
        result: db as IDBDatabase,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null,
      }
      queueMicrotask(() => {
        triggerUpgrade(req)
        triggerSuccess(req)
      })
      return req as unknown as IDBOpenDBRequest
    },
    deleteDatabase: () => {
      storeData.clear()
      const req: Record<string, unknown> = { onsuccess: null, onerror: null }
      queueMicrotask(() => triggerSuccess(req))
      return req as unknown as IDBOpenDBRequest
    },
  }

  return factory as unknown as IDBFactory
}

// ── Abertura do Banco de Dados ───────────────────────────────────



function getIDBFactory(): IDBFactory | undefined {
  if (simulatedFailure) {
    return undefined
  }
  if (customIDBFactory) {
    return customIDBFactory
  }
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB
  }
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB
  }
  return undefined
}


async function openIDB(): Promise<IDBDatabase | null> {
  const factory = getIDBFactory()
  if (!factory) {
    isDegradedState = true
    return null
  }

  return new Promise((resolve) => {
    try {
      const request = factory.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('scenarios')) {
          db.createObjectStore('scenarios', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('protocols')) {
          db.createObjectStore('protocols', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('custom')) {
          db.createObjectStore('custom', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('quarantine')) {
          db.createObjectStore('quarantine', { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        isDegradedState = false
        lastStorageError = null
        resolve(request.result)
      }

      request.onerror = () => {
        isDegradedState = true
        lastStorageError = request.error || new Error('Failed to open IndexedDB')
        resolve(null)
      }

      request.onblocked = () => {
        isDegradedState = true
        lastStorageError = new Error('IndexedDB open blocked')
        resolve(null)
      }
    } catch (err) {
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      resolve(null)
    }
  })
}

/**
 * Tenta reabrir o IndexedDB e recuperar do estado degradado.
 */
export async function retryStorageOpen(): Promise<boolean> {
  if (simulatedFailure) {
    return false
  }
  const db = await openIDB()
  if (db) {
    db.close()
    isDegradedState = false
    lastStorageError = null
    return true
  }
  return false
}

// ── Operações Genéricas de Storage ───────────────────────────────

/**
 * Lê todos os registros de um store específico.
 */
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const consent = getPersistenceConsent()
  const db = consent ? await openIDB() : null

  if (!db) {
    // Modo em memória
    switch (storeName) {
      case 'scenarios':
        return Array.from(inMemory.scenarios.values()) as T[]
      case 'protocols':
        return Array.from(inMemory.protocols.values()) as T[]
      case 'history':
        return Array.from(inMemory.history.values()) as T[]
      case 'quarantine':
        return Array.from(inMemory.quarantine.values()) as T[]
      case 'custom':
        return Array.from(inMemory.custom.entries()).map(([key, value]) => ({ key, value })) as T[]
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        db.close()
        resolve(request.result as T[])
      }
      request.onerror = () => {
        db.close()
        isDegradedState = true
        lastStorageError = request.error
        reject(request.error)
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      reject(err)
    }
  })
}

/**
 * Lê um item por chave de um store.
 */
export async function getFromStore<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const consent = getPersistenceConsent()
  const db = consent ? await openIDB() : null

  if (!db) {
    switch (storeName) {
      case 'scenarios':
        return inMemory.scenarios.get(key) as T | undefined
      case 'protocols':
        return inMemory.protocols.get(key) as T | undefined
      case 'history':
        return inMemory.history.get(key) as T | undefined
      case 'quarantine':
        return inMemory.quarantine.get(key) as T | undefined
      case 'custom':
        return inMemory.custom.get(key) as T | undefined
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        db.close()
        if (storeName === 'custom' && request.result) {
          resolve((request.result as CustomEntry).value as T)
        } else {
          resolve(request.result as T | undefined)
        }
      }
      request.onerror = () => {
        db.close()
        isDegradedState = true
        lastStorageError = request.error
        reject(request.error)
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      reject(err)
    }
  })
}

/**
 * Grava um item em um store.
 */
export async function putToStore<T extends { id?: string }>(
  storeName: StoreName,
  value: T,
  customKey?: string,
): Promise<void> {
  // Sempre atualiza o estado em memória da sessão
  if (storeName === 'scenarios' && value.id) {
    inMemory.scenarios.set(value.id, value as unknown as Scenario)
  } else if (storeName === 'protocols' && value.id) {
    inMemory.protocols.set(value.id, value as unknown as Protocol)
  } else if (storeName === 'history' && value.id) {
    inMemory.history.set(value.id, value as unknown as CalculationRecord)
  } else if (storeName === 'quarantine' && value.id) {
    inMemory.quarantine.set(value.id, value as unknown as QuarantineItem)
  } else if (storeName === 'custom' && customKey) {
    inMemory.custom.set(customKey, value)
  }

  const consent = getPersistenceConsent()
  if (!consent) {
    return
  }

  const db = await openIDB()
  if (!db) {
    return
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const entry = storeName === 'custom' ? { key: customKey, value } : value
      const request = store.put(entry)

      request.onsuccess = () => {
        db.close()
        resolve()
      }
      request.onerror = () => {
        db.close()
        isDegradedState = true
        lastStorageError = request.error
        reject(request.error)
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      reject(err)
    }
  })
}

/**
 * Remove um item por chave de um store.
 */
export async function deleteFromStore(storeName: StoreName, key: string): Promise<void> {
  switch (storeName) {
    case 'scenarios':
      inMemory.scenarios.delete(key)
      break
    case 'protocols':
      inMemory.protocols.delete(key)
      break
    case 'history':
      inMemory.history.delete(key)
      break
    case 'quarantine':
      inMemory.quarantine.delete(key)
      break
    case 'custom':
      inMemory.custom.delete(key)
      break
  }

  const consent = getPersistenceConsent()
  if (!consent) {
    return
  }

  const db = await openIDB()
  if (!db) {
    return
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => {
        db.close()
        resolve()
      }
      request.onerror = () => {
        db.close()
        isDegradedState = true
        lastStorageError = request.error
        reject(request.error)
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      reject(err)
    }
  })
}

/**
 * Limpa todos os registros de um store específico.
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  switch (storeName) {
    case 'scenarios':
      inMemory.scenarios.clear()
      break
    case 'protocols':
      inMemory.protocols.clear()
      break
    case 'history':
      inMemory.history.clear()
      break
    case 'quarantine':
      inMemory.quarantine.clear()
      break
    case 'custom':
      inMemory.custom.clear()
      break
  }

  const consent = getPersistenceConsent()
  if (!consent) {
    return
  }

  const db = await openIDB()
  if (!db) {
    return
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => {
        db.close()
        resolve()
      }
      request.onerror = () => {
        db.close()
        isDegradedState = true
        lastStorageError = request.error
        reject(request.error)
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      reject(err)
    }
  })
}

/**
 * Limpa todos os stores do banco (usado em desativação ou reset).
 */
export async function clearAllStores(): Promise<void> {
  inMemory.clearAll()

  const consent = getPersistenceConsent()
  if (!consent) {
    return
  }

  const db = await openIDB()
  if (!db) {
    return
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(
        ['scenarios', 'protocols', 'history', 'custom', 'quarantine'],
        'readwrite',
      )
      tx.objectStore('scenarios').clear()
      tx.objectStore('protocols').clear()
      tx.objectStore('history').clear()
      tx.objectStore('custom').clear()
      tx.objectStore('quarantine').clear()

      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        isDegradedState = true
        lastStorageError = tx.error
        reject(tx.error)
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      reject(err)
    }
  })
}

// ── Helpers de Alto Nível de ConfigPayload ───────────────────────

/**
 * Carrega o ConfigPayload atual (do IndexedDB ou do estado em memória).
 */
export async function loadConfigPayload(): Promise<ConfigPayload> {
  const settings = (await getFromStore<AppSettings>('custom', 'fk:v1:settings')) || DEFAULT_SETTINGS
  const favorites =
    (await getFromStore<Favorites>('custom', 'fk:v1:favorites')) || DEFAULT_FAVORITES
  const customSubstances =
    (await getFromStore<CustomSubstance[]>('custom', 'fk:v1:customSubstances')) || []
  const customProfiles =
    (await getFromStore<CustomProfile[]>('custom', 'fk:v1:customProfiles')) || []
  const recipes = (await getFromStore<ReconstitutionRecipe[]>('custom', 'fk:v1:recipes')) || []
  const scenarios = await getAllFromStore<Scenario>('scenarios')
  const protocols = await getAllFromStore<Protocol>('protocols')

  return {
    settings,
    favorites,
    customSubstances,
    customProfiles,
    recipes,
    scenarios,
    protocols,
  }
}

/**
 * Substitui o ConfigPayload no storage de forma atômica.
 */
export async function saveConfigPayload(payload: ConfigPayload): Promise<void> {
  // Atualiza in-memory
  inMemory.custom.set('fk:v1:settings', payload.settings)
  inMemory.custom.set('fk:v1:favorites', payload.favorites)
  inMemory.custom.set('fk:v1:customSubstances', payload.customSubstances)
  inMemory.custom.set('fk:v1:customProfiles', payload.customProfiles)
  inMemory.custom.set('fk:v1:recipes', payload.recipes)

  inMemory.scenarios.clear()
  for (const s of payload.scenarios) {
    inMemory.scenarios.set(s.id, s)
  }

  inMemory.protocols.clear()
  for (const p of payload.protocols) {
    inMemory.protocols.set(p.id, p)
  }

  const consent = getPersistenceConsent()
  if (!consent) {
    return
  }

  const db = await openIDB()
  if (!db) {
    return
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['scenarios', 'protocols', 'custom'], 'readwrite')
      const scenariosStore = tx.objectStore('scenarios')
      const protocolsStore = tx.objectStore('protocols')
      const customStore = tx.objectStore('custom')

      scenariosStore.clear()
      for (const s of payload.scenarios) {
        scenariosStore.put(s)
      }

      protocolsStore.clear()
      for (const p of payload.protocols) {
        protocolsStore.put(p)
      }

      customStore.put({ key: 'fk:v1:settings', value: payload.settings })
      customStore.put({ key: 'fk:v1:favorites', value: payload.favorites })
      customStore.put({ key: 'fk:v1:customSubstances', value: payload.customSubstances })
      customStore.put({ key: 'fk:v1:customProfiles', value: payload.customProfiles })
      customStore.put({ key: 'fk:v1:recipes', value: payload.recipes })

      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        isDegradedState = true
        lastStorageError = tx.error
        reject(tx.error)
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      reject(err)
    }
  })
}

/**
 * Helper para testes: limpa o storage e reseta o estado interno.
 */
export async function resetStorageForTesting(): Promise<void> {
  isDegradedState = false
  lastStorageError = null
  simulatedFailure = null
  inMemory.clearAll()

  const factory = getIDBFactory()
  if (factory && typeof factory.deleteDatabase === 'function') {
    await new Promise<void>((resolve) => {
      try {
        const req = factory.deleteDatabase(DB_NAME)
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => resolve()
      } catch {
        resolve()
      }
    })
  }
}
