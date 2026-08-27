// Store de quarentena compacta (§11, §14).
// Limites simultâneos:
// - máx. 5 itens (QUARANTINE_ITEMS_MAX)
// - máx. 256 KiB por item (QUARANTINE_ITEM_BYTES_MAX)
// - máx. 1 MiB total no store (QUARANTINE_TOTAL_BYTES_MAX)
// FIFO determinístico por ordem de inserção: podar os mais antigos enquanto qualquer limite for violado.

import type { InstantIso, QuarantineItem, QuarantineSource } from '../domain/types'
import { SAFETY_LIMITS } from '../validation/limits'
import { serializedUtf8Bytes, truncateUtf8Bytes } from './bytes'
import { deleteFromStore, getAllFromStore, putToStore } from './idb'

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

function calculateTotalQuarantineBytes(items: QuarantineItem[]): number {
  return items.reduce((acc, item) => acc + serializedUtf8Bytes(item), 0)
}

// Ordem de inserção interna mantida em memória para controle da fila FIFO
const quarantineInsertionOrder = new Map<string, number>()
let quarantineCounter = 0

/**
 * Adiciona um novo registro à quarentena compacta, aplicando truncamento byte-aware
 * e poda FIFO determinística sobre itens mais antigos.
 */
export async function addQuarantineItem(options: AddQuarantineOptions): Promise<AddQuarantineResult> {
  const id = options.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `quarantine-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
  const createdAt = options.createdAt || (new Date().toISOString() as InstantIso)

  // Monta item preliminar
  let excerpt = options.rawExcerptUtf8
  let truncated = false

  if (excerpt !== undefined) {
    // Estimativa de envelope sem excerto
    const envelopeWithoutExcerpt: QuarantineItem = {
      id,
      createdAt,
      source: options.source,
      errorCode: options.errorCode,
      originalUtf8Bytes: options.originalUtf8Bytes,
      truncated: false,
    }
    const baseBytes = serializedUtf8Bytes(envelopeWithoutExcerpt)
    const maxExcerptBytes = Math.max(0, SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX - baseBytes - 50)

    const truncResult = truncateUtf8Bytes(excerpt, maxExcerptBytes)
    excerpt = truncResult.text
    truncated = truncResult.truncated || options.originalUtf8Bytes > maxExcerptBytes
  }

  const newItem: QuarantineItem = {
    id,
    createdAt,
    source: options.source,
    errorCode: options.errorCode,
    originalUtf8Bytes: options.originalUtf8Bytes,
    ...(excerpt !== undefined ? { rawExcerptUtf8: excerpt } : {}),
    truncated,
  }

  // Garante que o item individual satisfaz o limite
  const itemBytes = serializedUtf8Bytes(newItem)
  if (itemBytes > SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX) {
    const forcedTrunc = truncateUtf8Bytes(excerpt || '', 100)
    newItem.rawExcerptUtf8 = forcedTrunc.text
    newItem.truncated = true
  }

  // Registra ordem de inserção do novo item
  quarantineCounter++
  quarantineInsertionOrder.set(newItem.id, quarantineCounter)

  // Carrega itens existentes ordenados pela ordem de inserção (mais antigos primeiro)
  const existing = await getAllFromStore<QuarantineItem>('quarantine')
  existing.sort((a, b) => {
    const orderA = quarantineInsertionOrder.get(a.id) ?? 0
    const orderB = quarantineInsertionOrder.get(b.id) ?? 0
    if (orderA !== orderB) {
      return orderA - orderB
    }
    return a.createdAt.localeCompare(b.createdAt)
  })

  // Adiciona o novo item à lista
  const updatedList = [...existing, newItem]
  await putToStore('quarantine', newItem)

  // Poda FIFO dos mais antigos enquanto contagem > 5 ou totalBytes > 1 MiB
  let evictedCount = 0
  let evictedBytes = 0

  while (
    updatedList.length > 1 &&
    (updatedList.length > SAFETY_LIMITS.QUARANTINE_ITEMS_MAX ||
      calculateTotalQuarantineBytes(updatedList) > SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX)
  ) {
    const oldest = updatedList[0]
    if (oldest.id === newItem.id) {
      break
    }
    const b = serializedUtf8Bytes(oldest)
    await deleteFromStore('quarantine', oldest.id)
    quarantineInsertionOrder.delete(oldest.id)
    updatedList.shift()
    evictedCount++
    evictedBytes += b
  }

  return {
    item: newItem,
    evictedCount,
    evictedBytes,
  }
}

/**
 * Retorna todos os itens da quarentena.
 */
export async function getQuarantineItems(): Promise<QuarantineItem[]> {
  const items = await getAllFromStore<QuarantineItem>('quarantine')
  items.sort((a, b) => {
    const orderA = quarantineInsertionOrder.get(a.id) ?? 0
    const orderB = quarantineInsertionOrder.get(b.id) ?? 0
    if (orderA !== orderB) {
      return orderB - orderA // Mais recentes primeiro
    }
    return b.createdAt.localeCompare(a.createdAt)
  })
  return items
}

/**
 * Remove um item específico da quarentena.
 */
export async function deleteQuarantineItem(id: string): Promise<void> {
  quarantineInsertionOrder.delete(id)
  await deleteFromStore('quarantine', id)
}
