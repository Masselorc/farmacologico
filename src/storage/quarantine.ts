// Quarentena compacta com envelope FIFO persistido, mutação atômica única e copy-out defensivo (§11, §18, E6.4).

import type { InstantIso, QuarantineItem, QuarantineSource } from '../domain/types'
import { SAFETY_LIMITS } from '../validation/limits'
import { serializedUtf8Bytes } from './bytes'
import { clonePersistedValue } from './clone'
import {
  commitStorageOperations,
  commitStorageOperationsUnlocked,
  getAllFromStore,
  type StorageOperation,
  type StoredQuarantineEntry,
} from './idb'
import { enqueueStorageMutation } from './queue'

export interface AddQuarantineOptions {
  source: QuarantineSource
  errorCode: string
  originalUtf8Bytes: number
  rawExcerptUtf8?: string
  createdAt?: InstantIso
  id?: string
}

export interface AddQuarantineResult {
  item: QuarantineItem
  evictedCount: number
  evictedBytes: number
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `quarantine-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function fitItem(options: AddQuarantineOptions, id: string, createdAt: InstantIso): QuarantineItem {
  const base = {
    id,
    createdAt,
    source: options.source,
    errorCode: options.errorCode,
    originalUtf8Bytes: options.originalUtf8Bytes,
  }
  const raw = options.rawExcerptUtf8
  if (raw === undefined) return { ...base, truncated: false }
  let low = 0
  let high = Math.min(raw.length, SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX)
  let best = ''
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    let end = middle
    if (end > 0 && end < raw.length) {
      const previous = raw.charCodeAt(end - 1)
      const next = raw.charCodeAt(end)
      if (previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end -= 1
    }
    const excerpt = raw.slice(0, end)
    const candidate: QuarantineItem = {
      ...base,
      rawExcerptUtf8: excerpt,
      truncated: end < raw.length,
    }
    if (serializedUtf8Bytes(candidate) <= SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX) {
      best = excerpt
      low = Math.max(middle + 1, end + 1)
    } else {
      high = middle - 1
    }
  }
  const suppliedBytes = new TextEncoder().encode(raw).byteLength
  return {
    ...base,
    rawExcerptUtf8: best,
    truncated: best !== raw || options.originalUtf8Bytes > suppliedBytes,
  }
}

function quarantineBytes(entries: StoredQuarantineEntry[]): number {
  return serializedUtf8Bytes(entries.map((entry) => entry.item))
}

/**
 * Insere item na quarentena sem re-adquirir o lock da fila global (unlocked) (§11, §18, E6.4).
 * Usado internamente durante a hidratação e recovery para prevenir deadlocks de reentrância.
 */
export async function addQuarantineItemUnlocked(options: AddQuarantineOptions): Promise<AddQuarantineResult> {
  const id = options.id && options.id.length <= 100 ? options.id : newId()
  const createdAt = options.createdAt || (new Date().toISOString() as InstantIso)
  const item = fitItem(options, id, createdAt)
  if (serializedUtf8Bytes(item) > SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX) {
    throw new Error('Quarantine item exceeds the individual byte budget')
  }

  const entries = await getAllFromStore<StoredQuarantineEntry>('quarantine')
  entries.sort((a, b) => a.insertionOrder - b.insertionOrder)
  const insertionOrder = entries.reduce((max, entry) => Math.max(max, entry.insertionOrder), 0) + 1
  const newest: StoredQuarantineEntry = { id, insertionOrder, item: clonePersistedValue(item) }
  const retained = [...entries.filter((entry) => entry.id !== id), newest]
  let evictedCount = 0
  let evictedBytes = 0

  while (
    retained.length > 1 &&
    (retained.length > SAFETY_LIMITS.QUARANTINE_ITEMS_MAX ||
      quarantineBytes(retained) > SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX)
  ) {
    const oldest = retained[0]
    if (oldest.id === newest.id) break
    retained.shift()
    evictedCount += 1
    evictedBytes += serializedUtf8Bytes(oldest.item)
  }

  const retainedIds = new Set(retained.map((entry) => entry.id))
  const operations: StorageOperation[] = [
    { kind: 'put', store: 'quarantine', value: newest },
    ...entries
      .filter((entry) => !retainedIds.has(entry.id))
      .map((entry): StorageOperation => ({ kind: 'delete', store: 'quarantine', key: entry.id })),
  ]
  await commitStorageOperationsUnlocked(operations)
  return {
    item: clonePersistedValue(item),
    evictedCount,
    evictedBytes,
  }
}

/**
 * API pública: executa snapshot síncrono dos argumentos (copy-in antes do enqueue) e enfileira a mutação (§11, E6.4).
 */
export async function addQuarantineItem(options: AddQuarantineOptions): Promise<AddQuarantineResult> {
  const snapshot = clonePersistedValue(options)
  return enqueueStorageMutation(() => addQuarantineItemUnlocked(snapshot))
}

export async function getQuarantineItems(): Promise<QuarantineItem[]> {
  const entries = await getAllFromStore<StoredQuarantineEntry>('quarantine')
  entries.sort((a, b) => b.insertionOrder - a.insertionOrder)
  return clonePersistedValue(entries.map((entry) => entry.item))
}

export async function deleteQuarantineItem(id: string): Promise<void> {
  await commitStorageOperations([{ kind: 'delete', store: 'quarantine', key: id }])
}

export async function clearQuarantine(): Promise<void> {
  await commitStorageOperations([{ kind: 'clear', store: 'quarantine' }])
}
