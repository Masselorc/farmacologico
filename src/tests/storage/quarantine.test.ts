import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import { setPersistenceConsent } from '../../storage/consent'
import {
  addQuarantineItem,
  deleteQuarantineItem,
  getQuarantineItems,
} from '../../storage/quarantine'
import { resetStorageForTesting, resetStorageSessionForTesting, setCustomIDBFactoryForTesting } from '../../storage/idb'
import { SAFETY_LIMITS } from '../../validation/limits'
import { serializedUtf8Bytes } from '../../storage/bytes'
import { openRawDatabase, readRawStore } from './idb-faults'

describe('Quarantine Storage, Bounds & Insertion FIFO (§11, §14, E6.1)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('CORREÇÃO 13: respeita o limite individual de 256 KiB aplicando truncamento byte-aware', async () => {
    // 300 KiB de texto
    const hugeText = '💊 Medicamento ' + 'X'.repeat(300 * 1024)
    const res = await addQuarantineItem({
      id: 'q-huge',
      source: 'config_import',
      errorCode: 'INVALID_JSON',
      originalUtf8Bytes: new TextEncoder().encode(hugeText).byteLength,
      rawExcerptUtf8: hugeText,
    })

    expect(res.item.truncated).toBe(true)
    const bytes = serializedUtf8Bytes(res.item)
    expect(bytes).toBeLessThanOrEqual(SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX)
  })

  it('CORREÇÃO 13: aplica poda determinística ao ultrapassar 5 itens', async () => {
    for (let i = 1; i <= 7; i++) {
      await addQuarantineItem({
        id: `q-item-${i}`,
        source: 'config_import',
        errorCode: `CODE_${i}`,
        originalUtf8Bytes: 100,
        rawExcerptUtf8: `Excerto ${i}`,
      })
    }

    const items = await getQuarantineItems()
    expect(items).toHaveLength(5)

    const ids = items.map((it) => it.id)
    expect(ids).not.toContain('q-item-1')
    expect(ids).not.toContain('q-item-2')
    expect(ids).toContain('q-item-3')
    expect(ids).toContain('q-item-7')
  })

  it('CORREÇÃO 13: aplica poda determinística quando o total ultrapassa 1 MiB', async () => {
    // Adiciona 5 itens de 240 KiB cada (total ~1.2 MiB > 1 MiB)
    for (let i = 1; i <= 5; i++) {
      const text = 'Y'.repeat(240 * 1024)
      await addQuarantineItem({
        id: `q-large-${i}`,
        source: 'full_backup_import',
        errorCode: 'LARGE_PAYLOAD',
        originalUtf8Bytes: new TextEncoder().encode(text).byteLength,
        rawExcerptUtf8: text,
      })
    }

    const items = await getQuarantineItems()
    const totalBytes = items.reduce((acc, it) => acc + serializedUtf8Bytes(it), 0)
    expect(totalBytes).toBeLessThanOrEqual(SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX)
  })

  it('preserva integridade de caracteres Unicode multibyte ao truncar', async () => {
    const emojiStr = '💉'.repeat(70000)
    const res = await addQuarantineItem({
      id: 'q-emoji',
      source: 'legacy_migration',
      errorCode: 'EMOJI_CORRUPT',
      originalUtf8Bytes: new TextEncoder().encode(emojiStr).byteLength,
      rawExcerptUtf8: emojiStr,
    })

    expect(res.item.truncated).toBe(true)
    const excerpt = res.item.rawExcerptUtf8 || ''
    // Não deve conter code point corrompido / quebrado no final
    expect(() => new TextEncoder().encode(excerpt)).not.toThrow()
    expect(excerpt.length).toBeGreaterThan(0)
  })

  it('permite deleção individual de itens de quarentena', async () => {
    await addQuarantineItem({
      id: 'q-del',
      source: 'idb_corruption',
      errorCode: 'TEST',
      originalUtf8Bytes: 50,
      rawExcerptUtf8: 'teste',
    })

    const itemsBefore = await getQuarantineItems()
    expect(itemsBefore).toHaveLength(1)

    await deleteQuarantineItem('q-del')
    const itemsAfter = await getQuarantineItems()
    expect(itemsAfter).toHaveLength(0)
  })

  it('preserva FIFO por insertionOrder depois de recarregar a sessão', async () => {
    for (let index = 1; index <= 5; index += 1) {
      await addQuarantineItem({
        id: `persisted-${index}`, source: 'config_import', errorCode: `E${index}`,
        originalUtf8Bytes: 1, rawExcerptUtf8: `${index}`,
        createdAt: `2026-08-${String(28 - index).padStart(2, '0')}T00:00:00.000Z`,
      })
    }
    resetStorageSessionForTesting()
    await addQuarantineItem({
      id: 'persisted-6', source: 'config_import', errorCode: 'E6',
      originalUtf8Bytes: 1, rawExcerptUtf8: '6', createdAt: '2020-01-01T00:00:00.000Z',
    })
    const ids = (await getQuarantineItems()).map((item) => item.id)
    expect(ids).not.toContain('persisted-1')
    expect(ids).toContain('persisted-2')
    expect(ids[0]).toBe('persisted-6')
  })

  it('normaliza entradas diretas E6.1 para envelopes sem usar createdAt como FIFO', async () => {
    const database = await openRawDatabase(indexedDB)
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction('quarantine', 'readwrite')
      const store = tx.objectStore('quarantine')
      for (let index = 1; index <= 5; index += 1) {
        store.put({
          id: `legacy-${index}`, source: 'config_import', errorCode: `L${index}`,
          originalUtf8Bytes: 1, rawExcerptUtf8: `${index}`, truncated: false,
          createdAt: index === 1 ? '2099-01-01T00:00:00.000Z' : `2020-01-0${index}T00:00:00.000Z`,
        })
      }
      tx.oncomplete = () => { database.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })

    resetStorageSessionForTesting()
    await addQuarantineItem({ id: 'legacy-6', source: 'config_import', errorCode: 'L6',
      originalUtf8Bytes: 1, rawExcerptUtf8: '6' })
    const ids = (await getQuarantineItems()).map((item) => item.id)
    expect(ids).not.toContain('legacy-1')
    const raw = await readRawStore<Record<string, unknown>>(indexedDB, 'quarantine')
    expect(raw.every((entry) => 'insertionOrder' in entry && 'item' in entry)).toBe(true)
  })
})
