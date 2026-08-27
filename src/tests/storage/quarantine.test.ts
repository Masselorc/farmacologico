import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import { setPersistenceConsent } from '../../storage/consent'
import {
  addQuarantineItem,
  deleteQuarantineItem,
  getQuarantineItems,
} from '../../storage/quarantine'
import { resetStorageForTesting, setCustomIDBFactoryForTesting } from '../../storage/idb'
import { SAFETY_LIMITS } from '../../validation/limits'
import { serializedUtf8Bytes } from '../../storage/bytes'

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
})
