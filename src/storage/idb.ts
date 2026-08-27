// Infraestrutura de armazenamento IndexedDB com degradação resiliente em memória (§11, §12).
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
  StoredHistoryEntry,
  StorageMode,
} from '../domain/types'
import {
  appSettingsSchema,
  calculationRecordSchema,
  favoritesSchema,
  protocolSchema,
  quarantineItemSchema,
  scenarioSchema,
  storedHistoryEntrySchema,
} from '../validation'

import { serializedUtf8Bytes, truncateUtf8Bytes } from './bytes'
import { detectInitialCalendarTimeZone, getPersistenceConsent } from './consent'

export const DB_NAME = 'farmakit_v1'
export const DB_VERSION = 1

export type StoreName = 'scenarios' | 'protocols' | 'history' | 'custom' | 'quarantine'

export function getDefaultSettings(): AppSettings {
  return {
    theme: 'system',
    calendarTimeZone: detectInitialCalendarTimeZone(),
  }
}

export function getDefaultFavorites(): Favorites {
  return {
    substances: [],
    recipeIds: [],
  }
}

interface CustomEntry {
  key: string
  value: unknown
}

// ── Estado de Degradação, Modo Formal e Sincronização ─────────────

let isDegradedState = false
let isRecoveringState = false
let lastStorageError: Error | null = null
let simulatedFailure: Error | null = null
let hasUnsyncedMemoryChanges = false

export function getStorageMode(): StorageMode {
  if (!getPersistenceConsent()) {
    return 'memory-only-consent-off'
  }
  if (isRecoveringState) {
    return 'recovering'
  }
  if (isDegradedState) {
    return 'degraded-memory'
  }
  return 'persistent-ok'
}

export function hasUnsyncedChanges(): boolean {
  return hasUnsyncedMemoryChanges
}

// Store em memória para modo degradado ou quando IndexedDB não está disponível / consentimento off
class InMemoryStore {
  scenarios = new Map<string, Scenario>()
  protocols = new Map<string, Protocol>()
  history = new Map<string, StoredHistoryEntry>()
  custom = new Map<string, unknown>()
  quarantine = new Map<string, QuarantineItem>()

  constructor() {
    this.resetDefaults()
  }

  resetDefaults() {
    this.custom.set('fk:v1:settings', getDefaultSettings())
    this.custom.set('fk:v1:favorites', getDefaultFavorites())
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
    this.resetDefaults()
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

// ── Quarentena Interna para Corrupção de IDB ─────────────────────

function recordIdbCorruption(rawItem: unknown, storeName: string, id?: string): void {
  if (storeName === 'quarantine') {
    // Tratamento especial para o store quarantine: descartar sem recursão
    return
  }
  try {
    const rawStr = JSON.stringify(rawItem)
    const bytes = serializedUtf8Bytes(rawItem)
    const truncResult = truncateUtf8Bytes(rawStr, 1024)
    const item: QuarantineItem = {
      id: id || `corrupt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      source: 'idb_corruption',
      errorCode: `IDB_CORRUPTED_ENTRY_${storeName.toUpperCase()}`,
      originalUtf8Bytes: bytes,
      rawExcerptUtf8: truncResult.text,
      truncated: truncResult.truncated || bytes > 1024,
    }
    inMemory.quarantine.set(item.id, item)

    // Tenta persistir na quarentena se possível
    openIDB().then((db) => {
      if (db) {
        try {
          const tx = db.transaction('quarantine', 'readwrite')
          tx.objectStore('quarantine').put(item)
          tx.oncomplete = () => db.close()
          tx.onerror = () => db.close()
        } catch {
          db.close()
        }
      }
    })
  } catch {
    // Ignora erro ao quarentenar item patológico
  }
}

// ── Tenta Recuperação e Sincronização ────────────────────────────

/**
 * Tenta reabrir o IndexedDB, sincroniza dados em memória alterados durante degradação e recupera o estado saudável.
 */
export async function retryStorageOpen(): Promise<boolean> {
  if (simulatedFailure) {
    return false
  }
  isRecoveringState = true

  try {
    const db = await openIDB()
    if (!db) {
      isRecoveringState = false
      isDegradedState = true
      return false
    }

    if (hasUnsyncedMemoryChanges) {
      // Sincroniza todas as alterações da memória para o IDB antes de declarar sucesso
      const tx = db.transaction(
        ['scenarios', 'protocols', 'history', 'custom', 'quarantine'],
        'readwrite',
      )
      const scenariosStore = tx.objectStore('scenarios')
      const protocolsStore = tx.objectStore('protocols')
      const historyStore = tx.objectStore('history')
      const customStore = tx.objectStore('custom')
      const quarantineStore = tx.objectStore('quarantine')

      scenariosStore.clear()
      for (const s of inMemory.scenarios.values()) {
        scenariosStore.put(s)
      }

      protocolsStore.clear()
      for (const p of inMemory.protocols.values()) {
        protocolsStore.put(p)
      }

      historyStore.clear()
      for (const h of inMemory.history.values()) {
        historyStore.put(h)
      }

      customStore.clear()
      for (const [key, value] of inMemory.custom.entries()) {
        customStore.put({ key, value })
      }

      quarantineStore.clear()
      for (const q of inMemory.quarantine.values()) {
        quarantineStore.put(q)
      }

      const syncSuccess = await new Promise<boolean>((resolve) => {
        tx.oncomplete = () => {
          db.close()
          resolve(true)
        }
        tx.onerror = () => {
          db.close()
          resolve(false)
        }
        tx.onabort = () => {
          db.close()
          resolve(false)
        }
      })

      if (!syncSuccess) {
        isRecoveringState = false
        isDegradedState = true
        return false
      }
    } else {
      db.close()
    }

    hasUnsyncedMemoryChanges = false
    isDegradedState = false
    lastStorageError = null
    isRecoveringState = false
    return true
  } catch (err) {
    isRecoveringState = false
    isDegradedState = true
    lastStorageError = err instanceof Error ? err : new Error(String(err))
    return false
  }
}

// ── Operações com Read-Validation ────────────────────────────────

function getInMemoryList<T>(storeName: StoreName): T[] {
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

/**
 * Lê todos os registros de um store com validação runtime de integridade.
 */
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const consent = getPersistenceConsent()
  const db = consent ? await openIDB() : null

  if (!db) {
    return getInMemoryList<T>(storeName)
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        db.close()
        const rawList = request.result || []
        const validList: T[] = []

        for (const raw of rawList) {
          if (storeName === 'scenarios') {
            const parsed = scenarioSchema.safeParse(raw)
            if (parsed.success) {
              validList.push(parsed.data as T)
              inMemory.scenarios.set(parsed.data.id, parsed.data)
            } else {
              recordIdbCorruption(raw, storeName, (raw as { id?: string })?.id)
            }
          } else if (storeName === 'protocols') {
            const parsed = protocolSchema.safeParse(raw)
            if (parsed.success) {
              validList.push(parsed.data as T)
              inMemory.protocols.set(parsed.data.id, parsed.data)
            } else {
              recordIdbCorruption(raw, storeName, (raw as { id?: string })?.id)
            }
          } else if (storeName === 'history') {
            const parsedEntry = storedHistoryEntrySchema.safeParse(raw)
            if (parsedEntry.success) {
              validList.push(parsedEntry.data as T)
              inMemory.history.set(parsedEntry.data.id, parsedEntry.data)
            } else {
              // Tenta fallback para CalculationRecord direto sem envelope
              const parsedRecord = calculationRecordSchema.safeParse(raw)
              if (parsedRecord.success) {
                const entry: StoredHistoryEntry = {
                  id: parsedRecord.data.id,
                  insertionOrder: Date.parse(parsedRecord.data.createdAt) || 0,
                  record: parsedRecord.data,
                }
                validList.push(entry as T)
                inMemory.history.set(entry.id, entry)
              } else {
                recordIdbCorruption(raw, storeName, (raw as { id?: string })?.id)
              }
            }
          } else if (storeName === 'quarantine') {
            const parsed = quarantineItemSchema.safeParse(raw)
            if (parsed.success) {
              validList.push(parsed.data as T)
              inMemory.quarantine.set(parsed.data.id, parsed.data)
            }
            // Não quarentena item defeituoso no store quarantine
          } else {
            validList.push(raw as T)
          }
        }

        resolve(validList)
      }

      request.onerror = () => {
        db.close()
        isDegradedState = true
        lastStorageError = request.error
        // Fallback gracioso para memória
        resolve(getInMemoryList<T>(storeName))
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      resolve(getInMemoryList<T>(storeName))
    }
  })
}



/**
 * Lê um item por chave de um store com validação runtime.
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

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        db.close()
        const raw = request.result
        if (raw === undefined || raw === null) {
          resolve(undefined)
          return
        }

        if (storeName === 'custom') {
          const entryVal = (raw as CustomEntry).value
          if (key === 'fk:v1:settings') {
            const parsed = appSettingsSchema.safeParse(entryVal)
            if (parsed.success) {
              inMemory.custom.set(key, parsed.data)
              resolve(parsed.data as T)
            } else {
              recordIdbCorruption(raw, storeName, key)
              resolve(getDefaultSettings() as T)
            }
          } else if (key === 'fk:v1:favorites') {
            const parsed = favoritesSchema.safeParse(entryVal)
            if (parsed.success) {
              inMemory.custom.set(key, parsed.data)
              resolve(parsed.data as T)
            } else {
              recordIdbCorruption(raw, storeName, key)
              resolve(getDefaultFavorites() as T)
            }
          } else {
            inMemory.custom.set(key, entryVal)
            resolve(entryVal as T)
          }
          return
        }

        if (storeName === 'scenarios') {
          const parsed = scenarioSchema.safeParse(raw)
          if (parsed.success) {
            inMemory.scenarios.set(parsed.data.id, parsed.data)
            resolve(parsed.data as T)
          } else {
            recordIdbCorruption(raw, storeName, key)
            resolve(undefined)
          }
          return
        }

        if (storeName === 'protocols') {
          const parsed = protocolSchema.safeParse(raw)
          if (parsed.success) {
            inMemory.protocols.set(parsed.data.id, parsed.data)
            resolve(parsed.data as T)
          } else {
            recordIdbCorruption(raw, storeName, key)
            resolve(undefined)
          }
          return
        }

        if (storeName === 'history') {
          const parsedEntry = storedHistoryEntrySchema.safeParse(raw)
          if (parsedEntry.success) {
            inMemory.history.set(parsedEntry.data.id, parsedEntry.data)
            resolve(parsedEntry.data as T)
          } else {
            const parsedRecord = calculationRecordSchema.safeParse(raw)
            if (parsedRecord.success) {
              const entry: StoredHistoryEntry = {
                id: parsedRecord.data.id,
                insertionOrder: Date.parse(parsedRecord.data.createdAt) || 0,
                record: parsedRecord.data,
              }
              inMemory.history.set(entry.id, entry)
              resolve(entry as T)
            } else {
              recordIdbCorruption(raw, storeName, key)
              resolve(undefined)
            }
          }
          return
        }

        resolve(raw as T)
      }

      request.onerror = () => {
        db.close()
        isDegradedState = true
        lastStorageError = request.error
        resolve(undefined)
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      resolve(undefined)
    }
  })
}

/**
 * Grava um item em um store com garantia de durabilidade na conclusão da transação.
 */
export async function putToStore<T extends { id?: string }>(
  storeName: StoreName,
  value: T,
  customKey?: string,
): Promise<void> {
  // Atualiza memória da sessão
  if (storeName === 'scenarios' && value.id) {
    inMemory.scenarios.set(value.id, value as unknown as Scenario)
  } else if (storeName === 'protocols' && value.id) {
    inMemory.protocols.set(value.id, value as unknown as Protocol)
  } else if (storeName === 'history' && value.id) {
    inMemory.history.set(value.id, value as unknown as StoredHistoryEntry)
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
    hasUnsyncedMemoryChanges = true
    return
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const entry = storeName === 'custom' ? { key: customKey, value } : value
      store.put(entry)

      tx.oncomplete = () => {
        db.close()
        resolve()
      }

      tx.onerror = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = tx.error
        reject(tx.error)
      }

      tx.onabort = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = new Error('Transaction aborted')
        reject(new Error('Transaction aborted'))
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      hasUnsyncedMemoryChanges = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      reject(err)
    }
  })
}

/**
 * Restaura atomicamente um FullBackup (configurações + histórico) tanto na memória quanto no IndexedDB.
 */
export async function restoreFullBackup(
  payload: ConfigPayload,
  history: CalculationRecord[],
): Promise<void> {
  // 1. Atualiza a memória
  inMemory.scenarios.clear()
  for (const s of payload.scenarios) {
    inMemory.scenarios.set(s.id, s)
  }

  inMemory.protocols.clear()
  for (const p of payload.protocols) {
    inMemory.protocols.set(p.id, p)
  }

  inMemory.custom.set('fk:v1:settings', payload.settings)
  inMemory.custom.set('fk:v1:favorites', payload.favorites)
  inMemory.custom.set('fk:v1:customSubstances', payload.customSubstances)
  inMemory.custom.set('fk:v1:customProfiles', payload.customProfiles)
  inMemory.custom.set('fk:v1:recipes', payload.recipes)

  inMemory.history.clear()
  for (let i = 0; i < history.length; i++) {
    const record = history[i]
    const entry: StoredHistoryEntry = {
      id: record.id,
      insertionOrder: history.length - i,
      record,
    }
    inMemory.history.set(record.id, entry)
  }

  // 2. Se consentimento ativado e IDB disponível, executa transação atômica única
  const consent = getPersistenceConsent()
  if (!consent) {
    return
  }

  const db = await openIDB()
  if (!db) {
    hasUnsyncedMemoryChanges = true
    return
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(
        ['scenarios', 'protocols', 'history', 'custom'],
        'readwrite',
      )
      const scenariosStore = tx.objectStore('scenarios')
      const protocolsStore = tx.objectStore('protocols')
      const customStore = tx.objectStore('custom')
      const historyStore = tx.objectStore('history')

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

      historyStore.clear()
      for (let i = 0; i < history.length; i++) {
        const record = history[i]
        const entry: StoredHistoryEntry = {
          id: record.id,
          insertionOrder: history.length - i,
          record,
        }
        historyStore.put(entry)
      }


      tx.oncomplete = () => {
        db.close()
        resolve()
      }

      tx.onerror = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = tx.error
        reject(tx.error)
      }

      tx.onabort = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = new Error('Restore transaction aborted')
        reject(new Error('Restore transaction aborted'))
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      hasUnsyncedMemoryChanges = true
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
    hasUnsyncedMemoryChanges = true
    return
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      store.delete(key)

      tx.oncomplete = () => {
        db.close()
        resolve()
      }

      tx.onerror = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = tx.error
        reject(tx.error)
      }

      tx.onabort = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = new Error('Transaction aborted')
        reject(new Error('Transaction aborted'))
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      hasUnsyncedMemoryChanges = true
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
    hasUnsyncedMemoryChanges = true
    return
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      store.clear()

      tx.oncomplete = () => {
        db.close()
        resolve()
      }

      tx.onerror = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = tx.error
        reject(tx.error)
      }

      tx.onabort = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = new Error('Transaction aborted')
        reject(new Error('Transaction aborted'))
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      hasUnsyncedMemoryChanges = true
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
    hasUnsyncedMemoryChanges = true
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
        hasUnsyncedMemoryChanges = true
        lastStorageError = tx.error
        reject(tx.error)
      }
      tx.onabort = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = new Error('Transaction aborted')
        reject(new Error('Transaction aborted'))
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      hasUnsyncedMemoryChanges = true
      lastStorageError = err instanceof Error ? err : new Error(String(err))
      reject(err)
    }
  })
}

/**
 * Purge físico incondicional: limpa fisicamente todos os dados persistidos no IndexedDB (§10, §11).
 * Não depende do consentimento atual.
 */
export async function purgePersistentData(): Promise<void> {
  inMemory.clearAll()
  hasUnsyncedMemoryChanges = false

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
        reject(tx.error)
      }
      tx.onabort = () => {
        db.close()
        reject(new Error('Purge transaction aborted'))
      }
    } catch (err) {
      db.close()
      reject(err)
    }
  })
}

// ── Helpers de Alto Nível de ConfigPayload ───────────────────────

/**
 * Carrega o ConfigPayload atual (do IndexedDB ou do estado em memória).
 */
export async function loadConfigPayload(): Promise<ConfigPayload> {
  const settings = (await getFromStore<AppSettings>('custom', 'fk:v1:settings')) || getDefaultSettings()
  const favorites =
    (await getFromStore<Favorites>('custom', 'fk:v1:favorites')) || getDefaultFavorites()
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
    hasUnsyncedMemoryChanges = true
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
        hasUnsyncedMemoryChanges = true
        lastStorageError = tx.error
        reject(tx.error)
      }
      tx.onabort = () => {
        db.close()
        isDegradedState = true
        hasUnsyncedMemoryChanges = true
        lastStorageError = new Error('Transaction aborted')
        reject(new Error('Transaction aborted'))
      }
    } catch (err) {
      db.close()
      isDegradedState = true
      hasUnsyncedMemoryChanges = true
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
  isRecoveringState = false
  lastStorageError = null
  simulatedFailure = null
  hasUnsyncedMemoryChanges = false
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
