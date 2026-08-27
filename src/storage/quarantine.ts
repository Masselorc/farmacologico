// Store de quarentena compacta (§11, §14).
// Limites simultâneos:
// - máx. 5 itens (QUARANTINE_ITEMS_MAX)
// - máx. 256 KiB por item (QUARANTINE_ITEM_BYTES_MAX)
// - máx. 1 MiB total no store (QUARANTINE_TOTAL_BYTES_MAX)
// FIFO determinístico: podar os mais antigos enquanto qualquer limite for violado.

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
    // Trunca ainda mais agressivamente o excerto
    const forcedTrunc = truncateUtf8Bytes(excerpt || '', 100)
    newItem.rawExcerptUtf8 = forcedTrunc.text
    newItem.truncated = true
  }

  // Carrega itens existentes ordenados por createdAt (mais antigos primeiro)
  const existing = await getAllFromStore<QuarantineItem>('quarantine')
  existing.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

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
    // O item mais antigo é o primeiro da fila (índice 0), desde que não seja o recém-inserido
    const oldest = updatedList[0]
    if (oldest.id === newItem.id) {
      break
    }
    const b = serializedUtf8Bytes(oldest)
    await deleteFromStore('quarantine', oldest.id)
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
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // Mais recentes primeiro para exibição
  return items
}

/**
 * Remove um item específico da quarentena.
 */
export async function deleteQuarantineItem(id: string): Promise<void> {
  await deleteFromStore('quarantine', id)
}
