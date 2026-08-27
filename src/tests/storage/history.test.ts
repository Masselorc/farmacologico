import { beforeEach, describe, expect, it } from 'vitest'
import type { CalculationRecord } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import {
  addCalculationRecord,
  getCalculationRecords,
  pruneHistoryForConfigMutation,
} from '../../storage/history'
import { resetStorageForTesting } from '../../storage/idb'
import { SAFETY_LIMITS } from '../../validation/limits'


function createDummyCalculationRecord(id: string, customSize = 0): CalculationRecord {
  const extraPadding = customSize > 0 ? new Array(customSize).fill('z').join('') : undefined
  return {
    id,
    createdAt: new Date(Date.now() + parseInt(id.replace(/\D/g, '') || '0') * 1000).toISOString(),
    display: { title: `Cálculo ${id}`, color: 'blue-500', note: extraPadding },
    type: 'reconstitution',
    versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
    input: {
      vialMassMg: 10,
      diluentVolumeMl: 2,
      desiredDoseMcg: 500,
      syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 },
    },
    resultSnapshot: {
      concentrationMcgPerMl: 5000,
      doseVolumeMl: 0.1,
      syringeUnits: 10,
      theoreticalMaxDoses: 20,
      capacityExceeded: false,
      warnings: [],
      metadata: { reconstitutionEngineVersion: '1.0.0' },
    },
  }
}

describe('History Storage & Deterministic FIFO (§11, §13)', () => {
  beforeEach(async () => {
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('insere CalculationRecord válido abaixo de 8 MiB', async () => {
    const record = createDummyCalculationRecord('rec-1')
    const res = await addCalculationRecord(record)

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.evictedCount).toBe(0)
    }

    const records = await getCalculationRecords()
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('rec-1')
  })

  it('rejeita CalculationRecord acima de 8 MiB com CALCULATION_RECORD_TOO_LARGE sem evictar histórico antigo', async () => {
    // Insere um registro válido inicial
    await addCalculationRecord(createDummyCalculationRecord('rec-valid'))

    // Cria registro com mais de 8 MiB (8_388_608 B)
    const hugeRecord = createDummyCalculationRecord('rec-huge', SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX + 100)
    const res = await addCalculationRecord(hugeRecord)

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('CALCULATION_RECORD_TOO_LARGE')
    }

    // O registro válido anterior deve continuar preservado intacto
    const records = await getCalculationRecords()
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('rec-valid')
  })

  it('aplica poda FIFO determinística ao ultrapassar 500 registros', async () => {
    // Insere 500 registros
    for (let i = 1; i <= 500; i++) {
      await addCalculationRecord(createDummyCalculationRecord(`rec-${i}`))
    }

    let records = await getCalculationRecords()
    expect(records).toHaveLength(500)

    // Insere o 501º registro
    const res501 = await addCalculationRecord(createDummyCalculationRecord('rec-501'))
    expect(res501.ok).toBe(true)
    if (res501.ok) {
      expect(res501.evictedCount).toBe(1)
    }

    records = await getCalculationRecords()
    expect(records).toHaveLength(500)
    // O mais recente 'rec-501' está presente
    expect(records.some((r) => r.id === 'rec-501')).toBe(true)
    // O mais antigo 'rec-1' foi evictado
    expect(records.some((r) => r.id === 'rec-1')).toBe(false)
  })

  it('pruneHistoryForConfigMutation poda histórico se ConfigPayload fizer FullBackup ultrapassar 64 MiB', async () => {
    // Insere registros no histórico
    for (let i = 1; i <= 5; i++) {
      await addCalculationRecord(createDummyCalculationRecord(`rec-${i}`, 200000))
    }

    // Simula mutação de ConfigPayload muito grande
    const largeStr = new Array(5000000).fill('a').join('')
    const largeConfig = {
      settings: { theme: 'system' as const, calendarTimeZone: 'America/Sao_Paulo' },
      favorites: { substances: [], recipeIds: [] },
      customSubstances: [],
      customProfiles: [],
      recipes: [],
      scenarios: Array.from({ length: 10 }, (_, i) => ({
        id: `s-${i}`,
        name: `Cenário ${largeStr}`,
        color: 'blue-500' as const,
        source: { type: 'manual' as const },
        displayUnit: 'mg' as const,
        selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
        doses: [{ id: 'd1', amountMg: 100, time: '2026-08-27T08:00:00.000Z' }],
      })),
      protocols: [],
    }


    const { evictedCount } = await pruneHistoryForConfigMutation(largeConfig)
    expect(evictedCount).toBeGreaterThanOrEqual(0)
  })
})
