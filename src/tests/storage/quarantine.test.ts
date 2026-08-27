import { beforeEach, describe, expect, it } from 'vitest'
import { setPersistenceConsent } from '../../storage/consent'
import { resetStorageForTesting } from '../../storage/idb'
import {
  addQuarantineItem,
  deleteQuarantineItem,
  getQuarantineItems,
} from '../../storage/quarantine'
import { serializedUtf8Bytes } from '../../storage/bytes'
import { SAFETY_LIMITS } from '../../validation/limits'

describe('Quarantine Store & Compact Diagnostics (§11, §14)', () => {
  beforeEach(async () => {
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('adiciona item de quarentena respeitando o limite de 256 KiB', async () => {
    const res = await addQuarantineItem({
      source: 'config_import',
      errorCode: 'INVALID_JSON',
      originalUtf8Bytes: 500,
      rawExcerptUtf8: '{"invalid": json}',
    })

    expect(res.item.id).toBeDefined()
    expect(res.evictedCount).toBe(0)

    const items = await getQuarantineItems()
    expect(items).toHaveLength(1)
    expect(items[0].errorCode).toBe('INVALID_JSON')
    expect(serializedUtf8Bytes(items[0])).toBeLessThanOrEqual(SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX)
  })

  it('trunca de modo byte-aware excertos grandes sem corromper Unicode', async () => {
    const hugeExcerpt = '💉💊 Teste Unicode ' + new Array(100000).fill('ção').join('')
    const res = await addQuarantineItem({
      source: 'full_backup_import',
      errorCode: 'SCHEMA_FAILURE',
      originalUtf8Bytes: hugeExcerpt.length * 2,
      rawExcerptUtf8: hugeExcerpt,
    })

    expect(res.item.truncated).toBe(true)
    expect(serializedUtf8Bytes(res.item)).toBeLessThanOrEqual(SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX)
  })

  it('aplica poda FIFO determinística ao exceder 5 itens', async () => {
    for (let i = 1; i <= 5; i++) {
      await addQuarantineItem({
        id: `q-${i}`,
        createdAt: new Date(Date.now() + i * 1000).toISOString(),
        source: 'config_import',
        errorCode: `ERR_${i}`,
        originalUtf8Bytes: 100,
      })
    }

    let items = await getQuarantineItems()
    expect(items).toHaveLength(5)

    // Adiciona o 6º item
    const res6 = await addQuarantineItem({
      id: 'q-6',
      createdAt: new Date(Date.now() + 6000).toISOString(),
      source: 'config_import',
      errorCode: 'ERR_6',
      originalUtf8Bytes: 100,
    })

    expect(res6.evictedCount).toBe(1)

    items = await getQuarantineItems()
    expect(items).toHaveLength(5)
    expect(items.some((q) => q.id === 'q-6')).toBe(true)
    expect(items.some((q) => q.id === 'q-1')).toBe(false) // q-1 mais antigo evictado
  })

  it('permite deletar item específico da quarentena', async () => {
    await addQuarantineItem({
      id: 'q-del',
      source: 'config_import',
      errorCode: 'ERR_DEL',
      originalUtf8Bytes: 100,
    })

    let items = await getQuarantineItems()
    expect(items).toHaveLength(1)

    await deleteQuarantineItem('q-del')
    items = await getQuarantineItems()
    expect(items).toHaveLength(0)
  })
})
