// IndexedDB da E6.2: memória autoritativa em degradação, journal de mutações
// e sucesso persistente reconhecido exclusivamente em transaction.oncomplete.

import type {
  AppSettings, CalculationRecord, ConfigPayload, CustomProfile, CustomSubstance,
  Favorites, Protocol, QuarantineItem, ReconstitutionRecipe, Scenario,
  StoredHistoryEntry, StorageMode,
} from '../domain/types'
import {
  appSettingsSchema, calculationRecordSchema, customProfileSchema,
  customSubstanceSchema, favoritesSchema, protocolSchema, quarantineItemSchema,
  reconstitutionRecipeSchema, scenarioSchema, storedHistoryEntrySchema,
} from '../validation'
import { configPayloadSchema } from '../validation/schemas/data-management'
import { CURRENT_DATASET_VERSION, ENGINE_VERSIONS } from '../domain/version'
import { SAFETY_LIMITS } from '../validation/limits'
import { serializedUtf8Bytes } from './bytes'
import { validateCalculationRecordRuntime, validateHistoricalInvariants } from './history-validation'
import { detectInitialCalendarTimeZone, getPersistenceConsent } from './consent'
import { validateConfigReferences } from './references'

export const DB_NAME = 'farmakit_v1'
// O keyPath não mudou; envelopes E6.1 são normalizados após a leitura.
export const DB_VERSION = 1

export type StoreName = 'scenarios' | 'protocols' | 'history' | 'custom' | 'quarantine'

export interface StoredQuarantineEntry {
  id: string
  insertionOrder: number
  item: QuarantineItem
}

export type StorageOperation =
  | { kind: 'put'; store: StoreName; value: unknown; key?: string }
  | { kind: 'delete'; store: StoreName; key: string }
  | { kind: 'clear'; store: StoreName }

type FailurePolicy = 'keep-session-change' | 'rollback-session-change'
interface DirtyMutation { operations: StorageOperation[] }
interface RawDatabaseSnapshot {
  scenarios: unknown[]
  protocols: unknown[]
  history: unknown[]
  custom: unknown[]
  quarantine: unknown[]
}

export function getDefaultSettings(): AppSettings {
  return { theme: 'system', calendarTimeZone: detectInitialCalendarTimeZone() }
}

export function getDefaultFavorites(): Favorites {
  return { substances: [], recipeIds: [] }
}

class InMemoryStore {
  scenarios = new Map<string, Scenario>()
  protocols = new Map<string, Protocol>()
  history = new Map<string, StoredHistoryEntry>()
  custom = new Map<string, unknown>()
  quarantine = new Map<string, StoredQuarantineEntry>()

  constructor(withDefaults = true) { if (withDefaults) this.resetDefaults() }

  resetDefaults(): void {
    this.custom.set('fk:v1:settings', getDefaultSettings())
    this.custom.set('fk:v1:favorites', getDefaultFavorites())
    this.custom.set('fk:v1:customSubstances', [])
    this.custom.set('fk:v1:customProfiles', [])
    this.custom.set('fk:v1:recipes', [])
  }

  clearAll(): void {
    this.scenarios.clear(); this.protocols.clear(); this.history.clear()
    this.custom.clear(); this.quarantine.clear(); this.resetDefaults()
  }

  clone(): InMemoryStore {
    const next = new InMemoryStore(false)
    next.scenarios = new Map(this.scenarios); next.protocols = new Map(this.protocols)
    next.history = new Map(this.history); next.custom = new Map(this.custom)
    next.quarantine = new Map(this.quarantine)
    return next
  }

  replaceWith(next: InMemoryStore): void {
    this.scenarios = next.scenarios; this.protocols = next.protocols
    this.history = next.history; this.custom = next.custom; this.quarantine = next.quarantine
  }
}

const inMemory = new InMemoryStore()
const dirtyJournal: DirtyMutation[] = []
let isDegradedState = false
let isRecoveringState = false
let lastStorageError: Error | null = null
let simulatedFailure: Error | null = null
let hasUnsyncedMemoryChanges = false
let memoryHydrated = false
let hydrationPromise: Promise<void> | null = null
let customIDBFactory: IDBFactory | undefined

function asError(value: unknown, fallback: string): Error {
  return value instanceof Error ? value : new Error(value ? String(value) : fallback)
}

function markDegraded(error: unknown, fallback = 'IndexedDB operation failed'): void {
  isDegradedState = true
  lastStorageError = asError(error, fallback)
}

export function getStorageMode(): StorageMode {
  if (!getPersistenceConsent()) return 'memory-only-consent-off'
  if (isRecoveringState) return 'recovering'
  if (isDegradedState) return 'degraded-memory'
  return 'persistent-ok'
}
export function isStorageDegraded(): boolean { return isDegradedState }
export function getLastStorageError(): Error | null { return lastStorageError }
export function hasUnsyncedChanges(): boolean { return hasUnsyncedMemoryChanges }

export function simulateIDBFailure(enabled: boolean, error?: Error): void {
  simulatedFailure = enabled ? error || new Error('Simulated IDB Failure') : null
  if (simulatedFailure) markDegraded(simulatedFailure)
}
export function setCustomIDBFactoryForTesting(factory: IDBFactory | undefined): void {
  customIDBFactory = factory
}

function getIDBFactory(): IDBFactory | undefined {
  if (simulatedFailure) return undefined
  if (customIDBFactory) return customIDBFactory
  if (typeof window !== 'undefined' && window.indexedDB) return window.indexedDB
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) return globalThis.indexedDB
  return undefined
}

async function openIDB(): Promise<IDBDatabase | null> {
  const factory = getIDBFactory()
  if (!factory) {
    markDegraded(simulatedFailure, 'IndexedDB is unavailable')
    return null
  }
  return new Promise((resolve) => {
    let settled = false
    const settle = (db: IDBDatabase | null): void => {
      if (settled) { db?.close(); return }
      settled = true; resolve(db)
    }
    try {
      const request = factory.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('scenarios')) db.createObjectStore('scenarios', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('protocols')) db.createObjectStore('protocols', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('custom')) db.createObjectStore('custom', { keyPath: 'key' })
        if (!db.objectStoreNames.contains('quarantine')) db.createObjectStore('quarantine', { keyPath: 'id' })
      }
      request.onsuccess = () => settle(request.result)
      request.onerror = () => { markDegraded(request.error, 'Failed to open IndexedDB'); settle(null) }
      request.onblocked = () => { markDegraded(new Error('IndexedDB open blocked')); settle(null) }
    } catch (error) { markDegraded(error, 'Failed to open IndexedDB'); settle(null) }
  })
}

function parseStoredQuarantineEntry(value: unknown): StoredQuarantineEntry | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  const item = quarantineItemSchema.safeParse(candidate.item)
  if (typeof candidate.id !== 'string' || !Number.isSafeInteger(candidate.insertionOrder) ||
      (candidate.insertionOrder as number) < 0 || !item.success || item.data.id !== candidate.id) return null
  return { id: candidate.id, insertionOrder: candidate.insertionOrder as number, item: item.data }
}

function applyOperation(target: InMemoryStore, operation: StorageOperation): void {
  if (operation.kind === 'clear') {
    if (operation.store === 'scenarios') target.scenarios.clear()
    else if (operation.store === 'protocols') target.protocols.clear()
    else if (operation.store === 'history') target.history.clear()
    else if (operation.store === 'quarantine') target.quarantine.clear()
    else target.custom.clear()
    return
  }
  if (operation.kind === 'delete') {
    if (operation.store === 'scenarios') target.scenarios.delete(operation.key)
    else if (operation.store === 'protocols') target.protocols.delete(operation.key)
    else if (operation.store === 'history') target.history.delete(operation.key)
    else if (operation.store === 'quarantine') target.quarantine.delete(operation.key)
    else target.custom.delete(operation.key)
    return
  }
  if (operation.store === 'custom') {
    if (!operation.key) throw new Error('Custom store put requires a key')
    target.custom.set(operation.key, operation.value); return
  }
  const value = operation.value as { id?: unknown }
  if (typeof value.id !== 'string') throw new Error(`${operation.store} put requires an id`)
  if (operation.store === 'scenarios') target.scenarios.set(value.id, operation.value as Scenario)
  else if (operation.store === 'protocols') target.protocols.set(value.id, operation.value as Protocol)
  else if (operation.store === 'history') target.history.set(value.id, operation.value as StoredHistoryEntry)
  else target.quarantine.set(value.id, operation.value as StoredQuarantineEntry)
}

function projectedMemory(operations: StorageOperation[]): InMemoryStore {
  const next = inMemory.clone()
  for (const operation of operations) applyOperation(next, operation)
  return next
}

function idbValue(operation: Extract<StorageOperation, { kind: 'put' }>): unknown {
  return operation.store === 'custom' ? { key: operation.key, value: operation.value } : operation.value
}

async function runTransaction(db: IDBDatabase, operations: StorageOperation[]): Promise<void> {
  const stores = [...new Set(operations.map((operation) => operation.store))]
  if (stores.length === 0) { db.close(); return }
  return new Promise((resolve, reject) => {
    let requestError: Error | null = null
    let settled = false
    const finish = (error?: unknown): void => {
      if (settled) return
      settled = true; db.close()
      if (error) reject(asError(error, 'IndexedDB transaction failed')); else resolve()
    }
    try {
      const tx = db.transaction(stores, 'readwrite')
      for (const operation of operations) {
        const store = tx.objectStore(operation.store)
        const request = operation.kind === 'put' ? store.put(idbValue(operation))
          : operation.kind === 'delete' ? store.delete(operation.key) : store.clear()
        request.onerror = () => { requestError = asError(request.error, `${operation.kind} request failed`) }
      }
      tx.oncomplete = () => finish()
      tx.onerror = () => finish(requestError || tx.error || new Error('IndexedDB transaction error'))
      tx.onabort = () => finish(requestError || tx.error || new Error('IndexedDB transaction aborted'))
    } catch (error) { finish(error) }
  })
}

function appendDirtyMutation(operations: StorageOperation[]): void {
  dirtyJournal.push({ operations }); hasUnsyncedMemoryChanges = true
}

async function readRawSnapshot(db: IDBDatabase): Promise<RawDatabaseSnapshot> {
  const names: StoreName[] = ['scenarios', 'protocols', 'history', 'custom', 'quarantine']
  return new Promise((resolve, reject) => {
    let settled = false
    const result = {} as RawDatabaseSnapshot
    const finish = (error?: unknown): void => {
      if (settled) return
      settled = true; db.close()
      if (error) reject(asError(error, 'IndexedDB hydration failed')); else resolve(result)
    }
    try {
      const tx = db.transaction(names, 'readonly')
      let requestError: Error | null = null
      for (const name of names) {
        const request = tx.objectStore(name).getAll()
        request.onsuccess = () => { result[name] = request.result || [] }
        request.onerror = () => { requestError = asError(request.error, `Failed to hydrate ${name}`) }
      }
      tx.oncomplete = () => finish()
      tx.onerror = () => finish(requestError || tx.error)
      tx.onabort = () => finish(requestError || tx.error || new Error('Hydration aborted'))
    } catch (error) { finish(error) }
  })
}

interface CorruptionNotice { raw: unknown; store: StoreName; id?: string }

async function recordIdbCorruption(notice: CorruptionNotice): Promise<void> {
  if (notice.store === 'quarantine') {
    lastStorageError = new Error('Corrupted entry found in quarantine store')
    return
  }
  try {
    const { addQuarantineItem } = await import('./quarantine')
    const rawText = JSON.stringify(notice.raw) || String(notice.raw)
    await addQuarantineItem({
      id: notice.id, source: 'idb_corruption',
      errorCode: `IDB_CORRUPTED_ENTRY_${notice.store.toUpperCase()}`,
      originalUtf8Bytes: new TextEncoder().encode(rawText).byteLength,
      rawExcerptUtf8: rawText,
    })
  } catch (error) { lastStorageError = asError(error, 'Failed to quarantine corrupted entry') }
}

function parseCustomEntry(raw: unknown, target: InMemoryStore, corruptions: CorruptionNotice[]): void {
  if (typeof raw !== 'object' || raw === null || typeof (raw as { key?: unknown }).key !== 'string') {
    corruptions.push({ raw, store: 'custom' }); return
  }
  const { key, value } = raw as { key: string; value: unknown }
  const schemas = {
    'fk:v1:settings': appSettingsSchema,
    'fk:v1:favorites': favoritesSchema,
    'fk:v1:customSubstances': customSubstanceSchema.array(),
    'fk:v1:customProfiles': customProfileSchema.array(),
    'fk:v1:recipes': reconstitutionRecipeSchema.array(),
  } as const
  const schema = schemas[key as keyof typeof schemas]
  if (!schema) { corruptions.push({ raw, store: 'custom', id: key }); return }
  const parsed = schema.safeParse(value)
  if (!parsed.success) { corruptions.push({ raw, store: 'custom', id: key }); return }
  target.custom.set(key, parsed.data)
}

async function hydrateMemory(): Promise<void> {
  if (memoryHydrated || getStorageMode() === 'degraded-memory' || !getPersistenceConsent()) return
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    const db = await openIDB()
    if (!db) return
    try {
      const raw = await readRawSnapshot(db)
      const next = new InMemoryStore()
      const corruptions: CorruptionNotice[] = []
      const normalization: StorageOperation[] = []

      for (const value of raw.scenarios) {
        const parsed = scenarioSchema.safeParse(value)
        if (parsed.success) next.scenarios.set(parsed.data.id, parsed.data)
        else corruptions.push({ raw: value, store: 'scenarios', id: (value as { id?: string })?.id })
      }
      for (const value of raw.protocols) {
        const parsed = protocolSchema.safeParse(value)
        if (parsed.success) next.protocols.set(parsed.data.id, parsed.data)
        else corruptions.push({ raw: value, store: 'protocols', id: (value as { id?: string })?.id })
      }
      for (const value of raw.custom) parseCustomEntry(value, next, corruptions)

      const validHistory: StoredHistoryEntry[] = []
      const legacyHistory: CalculationRecord[] = []
      for (const value of raw.history) {
        const entry = storedHistoryEntrySchema.safeParse(value)
        if (entry.success && entry.data.id === entry.data.record.id &&
            validateCalculationRecordRuntime(entry.data.record).valid) validHistory.push(entry.data)
        else {
          const record = calculationRecordSchema.safeParse(value)
          if (record.success && validateCalculationRecordRuntime(record.data).valid) legacyHistory.push(record.data)
          else corruptions.push({ raw: value, store: 'history', id: (value as { id?: string })?.id })
        }
      }
      let historyOrder = validHistory.reduce((max, entry) => Math.max(max, entry.insertionOrder), 0)
      for (const entry of validHistory) next.history.set(entry.id, entry)
      for (const record of legacyHistory) {
        const entry = { id: record.id, insertionOrder: ++historyOrder, record }
        next.history.set(entry.id, entry); normalization.push({ kind: 'put', store: 'history', value: entry })
      }

      const validQuarantine: StoredQuarantineEntry[] = []
      const legacyQuarantine: QuarantineItem[] = []
      for (const value of raw.quarantine) {
        const entry = parseStoredQuarantineEntry(value)
        if (entry) validQuarantine.push(entry)
        else {
          const item = quarantineItemSchema.safeParse(value)
          if (item.success) legacyQuarantine.push(item.data)
          else {
            corruptions.push({ raw: value, store: 'quarantine', id: (value as { id?: string })?.id })
            if (typeof (value as { id?: unknown })?.id === 'string')
              normalization.push({ kind: 'delete', store: 'quarantine', key: (value as { id: string }).id })
          }
        }
      }
      let quarantineOrder = validQuarantine.reduce((max, entry) => Math.max(max, entry.insertionOrder), 0)
      for (const entry of validQuarantine) next.quarantine.set(entry.id, entry)
      for (const item of legacyQuarantine) {
        const entry = { id: item.id, insertionOrder: ++quarantineOrder, item }
        next.quarantine.set(entry.id, entry); normalization.push({ kind: 'put', store: 'quarantine', value: entry })
      }

      const payload: ConfigPayload = {
        settings: next.custom.get('fk:v1:settings') as AppSettings,
        favorites: next.custom.get('fk:v1:favorites') as Favorites,
        customSubstances: next.custom.get('fk:v1:customSubstances') as CustomSubstance[],
        customProfiles: next.custom.get('fk:v1:customProfiles') as CustomProfile[],
        recipes: next.custom.get('fk:v1:recipes') as ReconstitutionRecipe[],
        scenarios: [...next.scenarios.values()], protocols: [...next.protocols.values()],
      }
      const references = validateConfigReferences(payload)
      if (!references.valid) {
        corruptions.push({ raw: payload, store: 'custom', id: 'fk:v1:config-references' })
        next.scenarios.clear(); next.protocols.clear()
        next.custom.set('fk:v1:favorites', getDefaultFavorites())
        next.custom.set('fk:v1:customSubstances', []); next.custom.set('fk:v1:customProfiles', [])
        next.custom.set('fk:v1:recipes', [])
      }

      inMemory.replaceWith(next); memoryHydrated = true
      if (normalization.length > 0) {
        try {
          const normalizationDb = await openIDB()
          if (!normalizationDb) appendDirtyMutation(normalization)
          else await runTransaction(normalizationDb, normalization)
        } catch (error) { markDegraded(error); appendDirtyMutation(normalization) }
      }
      for (const corruption of corruptions) await recordIdbCorruption(corruption)
    } catch (error) { markDegraded(error, 'IndexedDB hydration failed') }
  })()
  try { await hydrationPromise } finally { hydrationPromise = null }
}

export async function commitStorageOperations(
  operations: StorageOperation[],
  failurePolicy: FailurePolicy = 'keep-session-change',
): Promise<void> {
  if (operations.length === 0) return
  if (getStorageMode() === 'persistent-ok') await hydrateMemory()
  const next = projectedMemory(operations)
  if (!getPersistenceConsent()) {
    inMemory.replaceWith(next); memoryHydrated = true; return
  }
  if (getStorageMode() === 'degraded-memory') {
    inMemory.replaceWith(next); appendDirtyMutation(operations); memoryHydrated = true; return
  }
  const db = await openIDB()
  if (!db) {
    inMemory.replaceWith(next); appendDirtyMutation(operations); memoryHydrated = true; return
  }
  try {
    await runTransaction(db, operations)
    inMemory.replaceWith(next); memoryHydrated = true
  } catch (error) {
    markDegraded(error)
    if (failurePolicy === 'keep-session-change') {
      inMemory.replaceWith(next); appendDirtyMutation(operations); memoryHydrated = true
    }
    throw error
  }
}

export async function retryStorageOpen(): Promise<boolean> {
  if (simulatedFailure) return false
  isRecoveringState = true
  try {
    const db = await openIDB()
    if (!db) return false
    const pending = dirtyJournal.flatMap((mutation) => mutation.operations)
    if (pending.length > 0) await runTransaction(db, pending); else db.close()
    dirtyJournal.length = 0; hasUnsyncedMemoryChanges = false
    isDegradedState = false; lastStorageError = null; memoryHydrated = false
    isRecoveringState = false
    await hydrateMemory()
    return !isDegradedState
  } catch (error) {
    markDegraded(error, 'IndexedDB recovery failed'); return false
  } finally { isRecoveringState = false }
}

function memoryList<T>(store: StoreName): T[] {
  if (store === 'scenarios') return [...inMemory.scenarios.values()] as T[]
  if (store === 'protocols') return [...inMemory.protocols.values()] as T[]
  if (store === 'history') return [...inMemory.history.values()] as T[]
  if (store === 'quarantine') return [...inMemory.quarantine.values()] as T[]
  return [...inMemory.custom.entries()].map(([key, value]) => ({ key, value })) as T[]
}

export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  if (getStorageMode() === 'persistent-ok') await hydrateMemory()
  return memoryList<T>(storeName)
}
export async function getFromStore<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  if (getStorageMode() === 'persistent-ok') await hydrateMemory()
  if (storeName === 'scenarios') return inMemory.scenarios.get(key) as T | undefined
  if (storeName === 'protocols') return inMemory.protocols.get(key) as T | undefined
  if (storeName === 'history') return inMemory.history.get(key) as T | undefined
  if (storeName === 'quarantine') return inMemory.quarantine.get(key) as T | undefined
  return inMemory.custom.get(key) as T | undefined
}

export async function putToStore<T extends { id?: string }>(storeName: StoreName, value: T, customKey?: string): Promise<void> {
  await commitStorageOperations([{ kind: 'put', store: storeName, value, key: customKey }])
}
export async function deleteFromStore(storeName: StoreName, key: string): Promise<void> {
  await commitStorageOperations([{ kind: 'delete', store: storeName, key }])
}
export async function clearStore(storeName: StoreName): Promise<void> {
  await commitStorageOperations([{ kind: 'clear', store: storeName }])
}

export async function clearAllStores(): Promise<void> {
  await commitStorageOperations([
    { kind: 'clear', store: 'scenarios' }, { kind: 'clear', store: 'protocols' },
    { kind: 'clear', store: 'history' }, { kind: 'clear', store: 'custom' },
    { kind: 'clear', store: 'quarantine' },
    { kind: 'put', store: 'custom', key: 'fk:v1:settings', value: getDefaultSettings() },
    { kind: 'put', store: 'custom', key: 'fk:v1:favorites', value: getDefaultFavorites() },
    { kind: 'put', store: 'custom', key: 'fk:v1:customSubstances', value: [] },
    { kind: 'put', store: 'custom', key: 'fk:v1:customProfiles', value: [] },
    { kind: 'put', store: 'custom', key: 'fk:v1:recipes', value: [] },
  ])
}

export async function purgePersistentData(): Promise<void> {
  const db = await openIDB()
  if (!db) throw lastStorageError || new Error('Unable to open IndexedDB for purge')
  try {
    await runTransaction(db, [
      { kind: 'clear', store: 'scenarios' }, { kind: 'clear', store: 'protocols' },
      { kind: 'clear', store: 'history' }, { kind: 'clear', store: 'custom' },
      { kind: 'clear', store: 'quarantine' },
    ])
    inMemory.clearAll(); dirtyJournal.length = 0; hasUnsyncedMemoryChanges = false
    isDegradedState = false; lastStorageError = null; memoryHydrated = true
  } catch (error) { markDegraded(error, 'Persistent purge failed'); throw error }
}

export async function loadConfigPayload(): Promise<ConfigPayload> {
  if (getStorageMode() === 'persistent-ok') await hydrateMemory()
  const payload: ConfigPayload = {
    settings: (inMemory.custom.get('fk:v1:settings') as AppSettings | undefined) || getDefaultSettings(),
    favorites: (inMemory.custom.get('fk:v1:favorites') as Favorites | undefined) || getDefaultFavorites(),
    customSubstances: (inMemory.custom.get('fk:v1:customSubstances') as CustomSubstance[] | undefined) || [],
    customProfiles: (inMemory.custom.get('fk:v1:customProfiles') as CustomProfile[] | undefined) || [],
    recipes: (inMemory.custom.get('fk:v1:recipes') as ReconstitutionRecipe[] | undefined) || [],
    scenarios: [...inMemory.scenarios.values()], protocols: [...inMemory.protocols.values()],
  }
  const parsed = configPayloadSchema.safeParse(payload)
  const references = parsed.success ? validateConfigReferences(parsed.data) : { valid: false as const }
  if (!parsed.success || !references.valid) return {
    settings: getDefaultSettings(), favorites: getDefaultFavorites(), customSubstances: [],
    customProfiles: [], recipes: [], scenarios: [], protocols: [],
  }
  return parsed.data
}

function configOperations(payload: ConfigPayload): StorageOperation[] {
  return [
    { kind: 'clear', store: 'scenarios' },
    ...payload.scenarios.map((value): StorageOperation => ({ kind: 'put', store: 'scenarios', value })),
    { kind: 'clear', store: 'protocols' },
    ...payload.protocols.map((value): StorageOperation => ({ kind: 'put', store: 'protocols', value })),
    { kind: 'clear', store: 'custom' },
    { kind: 'put', store: 'custom', key: 'fk:v1:settings', value: payload.settings },
    { kind: 'put', store: 'custom', key: 'fk:v1:favorites', value: payload.favorites },
    { kind: 'put', store: 'custom', key: 'fk:v1:customSubstances', value: payload.customSubstances },
    { kind: 'put', store: 'custom', key: 'fk:v1:customProfiles', value: payload.customProfiles },
    { kind: 'put', store: 'custom', key: 'fk:v1:recipes', value: payload.recipes },
  ]
}

function assertConfig(payload: ConfigPayload): void {
  const parsed = configPayloadSchema.safeParse(payload)
  if (!parsed.success) throw new Error(`STRUCTURAL_VALIDATION_FAILED: ${parsed.error.message}`)
  const references = validateConfigReferences(parsed.data)
  if (!references.valid) throw new Error(`REFERENCE_VALIDATION_FAILED: ${references.error}`)
  if (serializedUtf8Bytes(parsed.data) > SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX) {
    throw new Error('PAYLOAD_SIZE_EXCEEDED')
  }
}

export async function saveConfigPayload(payload: ConfigPayload): Promise<void> {
  assertConfig(payload)
  await commitStorageOperations(configOperations(payload), 'rollback-session-change')
}

export async function replaceConfigAndPruneHistory(payload: ConfigPayload, evictedHistoryIds: string[]): Promise<void> {
  assertConfig(payload)
  await commitStorageOperations([
    ...configOperations(payload),
    ...evictedHistoryIds.map((key): StorageOperation => ({ kind: 'delete', store: 'history', key })),
  ], 'rollback-session-change')
}

export async function restoreFullBackup(payload: ConfigPayload, history: CalculationRecord[]): Promise<void> {
  assertConfig(payload)
  const validation = validateHistoricalInvariants(history)
  if (!validation.valid) throw new Error(`HISTORICAL_INVARIANTS_FAILED: ${validation.error}`)
  if (history.length > SAFETY_LIMITS.HISTORY_RECORDS_MAX ||
      serializedUtf8Bytes(history) > SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX ||
      history.some((record) => serializedUtf8Bytes(record) > SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX)) {
    throw new Error('HISTORY_BUDGET_EXCEEDED')
  }
  const projectedBundle = {
    bundleKind: 'full-backup', schemaVersion: 1, exportedAt: new Date().toISOString(),
    datasetVersion: CURRENT_DATASET_VERSION, engineVersions: ENGINE_VERSIONS,
    payload, history,
    counts: { records: history.length, recipes: payload.recipes.length,
      scenarios: payload.scenarios.length, protocols: payload.protocols.length },
  }
  if (serializedUtf8Bytes(projectedBundle) > SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX) {
    throw new Error('FULL_BACKUP_SIZE_EXCEEDED')
  }
  const entries = history.map((record, index): StoredHistoryEntry => ({
    id: record.id, insertionOrder: history.length - index, record,
  }))
  await commitStorageOperations([
    ...configOperations(payload), { kind: 'clear', store: 'history' },
    ...entries.map((value): StorageOperation => ({ kind: 'put', store: 'history', value })),
  ], 'rollback-session-change')
}

export function resetStorageSessionForTesting(): void {
  isDegradedState = false; isRecoveringState = false; lastStorageError = null
  simulatedFailure = null; hasUnsyncedMemoryChanges = false; dirtyJournal.length = 0
  inMemory.clearAll(); memoryHydrated = false; hydrationPromise = null
}

export async function resetStorageForTesting(): Promise<void> {
  resetStorageSessionForTesting()
  const factory = getIDBFactory()
  if (factory && typeof factory.deleteDatabase === 'function') {
    await new Promise<void>((resolve) => {
      try {
        const request = factory.deleteDatabase(DB_NAME)
        request.onsuccess = () => resolve(); request.onerror = () => resolve(); request.onblocked = () => resolve()
      } catch { resolve() }
    })
  }
}
