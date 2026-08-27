import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import {
  addCalculationRecord,
  deleteCalculationRecord,
  getCalculationRecordById,
  getCalculationRecords,
} from '../../storage/history'
import { resetStorageForTesting, resetStorageSessionForTesting, setCustomIDBFactoryForTesting } from '../../storage/idb'
import { SAFETY_LIMITS } from '../../validation/limits'
import { openRawDatabase, readRawStore } from './idb-faults'
import type { StoredHistoryEntry } from '../../domain/types'

function createSampleRecord(id: string, createdAt: string, paddingChars = 0): CalculationRecord {
  return {
    id,
    createdAt,
    display: { title: `Registro ${id}`, color: 'emerald-500', note: 'x'.repeat(paddingChars) },
    type: 'reconstitution',
    versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
    input: {
      vialMassMg: 10,
      diluentVolumeMl: 2,
      desiredDoseMcg: 100,
      syringe: {
        family: 'U-100',
        capacityUnits: 100,
        unitsPerMl: 100,
        graduationUnits: 1,
      },
    },

    resultSnapshot: {
      concentrationMcgPerMl: 5000,
      doseVolumeMl: 0.02,
      syringeUnits: 2,
      theoreticalMaxDoses: 100,
      capacityExceeded: false,
      warnings: [],
      metadata: { reconstitutionEngineVersion: '1.0.0' },
    },
  }
}

describe('History Storage, Insertion-Order FIFO & ID Immutability (§11, §13, E6.1)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('rejeita gravação de registro individual maior que 8 MiB sem podar histórico existente', async () => {
    const validRec = createSampleRecord('rec-valid', '2026-08-27T08:00:00.000Z', 100)
    await addCalculationRecord(validRec)

    // Cria registro de ~9 MiB
    const oversizedRec = createSampleRecord('rec-oversized', '2026-08-27T08:01:00.000Z', 9 * 1024 * 1024)
    const res = await addCalculationRecord(oversizedRec)

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('CALCULATION_RECORD_TOO_LARGE')
    }

    // O registro válido anterior deve permanecer intocado
    const records = await getCalculationRecords()
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('rec-valid')
  })

  it('rejeita CalculationRecord estruturalmente inválido antes de inserir ou evictar', async () => {
    const valid = createSampleRecord('valid-before-invalid', '2026-08-27T08:00:00.000Z')
    await addCalculationRecord(valid)
    const invalid = { ...createSampleRecord('invalid-record', '2026-08-27T09:00:00.000Z'),
      resultSnapshot: { invalid: true } } as unknown as CalculationRecord
    const result = await addCalculationRecord(invalid)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.internalReason).toBe('STRUCTURAL_VALIDATION_FAILED')
    expect(await getCalculationRecords()).toEqual([valid])
  })

  it('CORREÇÃO 4: FIFO determinístico usa insertionOrder persistida e NÃO usa createdAt', async () => {
    // Cada registro individual tem 7 MB (abaixo do teto de 8 MiB).
    // Total de 7 registros = 49 MB (> 47 MiB do HISTORY_TOTAL_BYTES_MAX).
    // rec-A: inserido 1º, mas com createdAt NOVO (2026-08-27)
    // rec-B: inserido 2º, mas com createdAt ANTIGO (2025-01-01)
    const recA = createSampleRecord('rec-A', '2026-08-27T12:00:00.000Z', 7 * 1024 * 1024)
    const recB = createSampleRecord('rec-B', '2025-01-01T00:00:00.000Z', 7 * 1024 * 1024)

    await addCalculationRecord(recA)
    await addCalculationRecord(recB)

    for (let i = 3; i <= 6; i++) {
      const rec = createSampleRecord(`rec-${i}`, '2026-08-27T08:00:00.000Z', 7 * 1024 * 1024)
      await addCalculationRecord(rec)
    }

    // 7º registro: total ultrapassa 47 MiB
    // A poda FIFO por insertionOrder DEVE remover o registro rec-A (inserido primeiro),
    // mesmo que o createdAt de A seja mais recente que o createdAt de B!
    const rec7 = createSampleRecord('rec-7', '2026-08-27T13:00:00.000Z', 7 * 1024 * 1024)
    const res7 = await addCalculationRecord(rec7)
    expect(res7.ok).toBe(true)

    const remaining = await getCalculationRecords()
    const remainingIds = remaining.map((r) => r.id)

    // A deve ter sido evictado porque foi inserido primeiro
    expect(remainingIds).not.toContain('rec-A')
    expect(remainingIds).toContain('rec-B')
    expect(remainingIds).toContain('rec-7')
  })

  it('suporta registros com createdAt idênticos preservando a ordem de inserção', async () => {
    const sameDate = '2026-08-27T10:00:00.000Z'
    for (let i = 1; i <= 6; i++) {
      const rec = createSampleRecord(`same-${i}`, sameDate, 7 * 1024 * 1024)
      await addCalculationRecord(rec)
    }

    const rec7 = createSampleRecord('same-7', sameDate, 7 * 1024 * 1024)
    await addCalculationRecord(rec7)

    const remaining = await getCalculationRecords()
    const ids = remaining.map((r) => r.id)

    // same-1 foi o primeiro inserido e deve ter sido evictado
    expect(ids).not.toContain('same-1')
    expect(ids).toContain('same-2')
    expect(ids).toContain('same-7')
  })


  it('CORREÇÃO 4: imutabilidade por ID não sobrescreve registro histórico com mesmo ID', async () => {
    const original = createSampleRecord('immutable-id', '2026-08-27T08:00:00.000Z', 100)
    original.display.title = 'Título Original'
    await addCalculationRecord(original)

    const duplicate = createSampleRecord('immutable-id', '2026-08-27T09:00:00.000Z', 100)
    duplicate.display.title = 'Título Modificado Que Deve Ser Rejeitado'

    const res = await addCalculationRecord(duplicate)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.internalReason).toBe('DUPLICATE_HISTORY_ID')

    const fetched = await getCalculationRecordById('immutable-id')
    expect(fetched?.display.title).toBe('Título Original')
  })

  it('permite consulta por ID e deleção individual de registro', async () => {
    const rec = createSampleRecord('rec-crud', '2026-08-27T08:00:00.000Z')
    await addCalculationRecord(rec)

    const fetched = await getCalculationRecordById('rec-crud')
    expect(fetched).toBeDefined()
    expect(fetched?.id).toBe('rec-crud')

    await deleteCalculationRecord('rec-crud')
    const afterDelete = await getCalculationRecordById('rec-crud')
    expect(afterDelete).toBeUndefined()
  })

  it(
    'aplica poda FIFO determinística ao ultrapassar 500 registros',
    async () => {
      // Insere 505 registros pequenos
      for (let i = 1; i <= 505; i++) {
        const rec = createSampleRecord(`rec-cnt-${i}`, '2026-08-27T08:00:00.000Z')
        await addCalculationRecord(rec)
      }

      const records = await getCalculationRecords()
      expect(records.length).toBeLessThanOrEqual(SAFETY_LIMITS.HISTORY_RECORDS_MAX)
      expect(records.length).toBe(500)

      // Os registros 1 a 5 devem ter sido evictados
      const ids = new Set(records.map((r) => r.id))
      expect(ids.has('rec-cnt-1')).toBe(false)
      expect(ids.has('rec-cnt-5')).toBe(false)
      expect(ids.has('rec-cnt-6')).toBe(true)
      expect(ids.has('rec-cnt-505')).toBe(true)
    },
    30000,
  )

  it('normaliza CalculationRecord direto sem usar createdAt como autoridade FIFO', async () => {
    const database = await openRawDatabase(indexedDB)
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction('history', 'readwrite')
      const store = tx.objectStore('history')
      for (let index = 0; index < SAFETY_LIMITS.HISTORY_RECORDS_MAX; index += 1) {
        const id = `legacy-${String(index).padStart(3, '0')}`
        store.put(createSampleRecord(
          id,
          index === 0 ? '2099-01-01T00:00:00.000Z' : '2020-01-01T00:00:00.000Z',
        ))
      }
      tx.oncomplete = () => { database.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })

    resetStorageSessionForTesting()
    await addCalculationRecord(createSampleRecord('newest', '1900-01-01T00:00:00.000Z'))
    const ids = (await getCalculationRecords()).map((entry) => entry.id)
    expect(ids).not.toContain('legacy-000')
    expect(ids).toContain('legacy-001')
    expect(ids[0]).toBe('newest')
    const raw = await readRawStore<StoredHistoryEntry>(indexedDB, 'history')
    expect(raw.every((entry) => typeof entry.insertionOrder === 'number' && 'record' in entry)).toBe(true)
  })
})
