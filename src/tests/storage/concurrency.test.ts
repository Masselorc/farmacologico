import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, Scenario, StoredHistoryEntry } from '../../domain/types'
import {
  addCalculationRecord,
  getCalculationRecords,
  getQuarantineItems,
  getStorageMode,
  hasUnsyncedChanges,
  loadConfigPayload,
  mutateConfigPayload,
  retryStorageOpen,
} from '../../storage'
import {
  putToStore,
  resetStorageForTesting,
  resetStorageSessionForTesting,
  setCustomIDBFactoryForTesting,
  setPersistenceConsentForTesting,
  simulateIDBFailure,
} from '../../storage/testing'
import { openRawDatabase, readRawStore } from './idb-faults'

function createDummyScenario(id: string, name: string): Scenario {
  return {
    id,
    name,
    color: 'blue-500',
    source: {
      type: 'manual',
      pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null },
    },
    displayUnit: 'mg',
    selectedPkParameters: { halfLifeMs: 43200000, tmaxMs: null },
    doses: [{ id: `d-${id}`, amountMg: 50, time: '2026-08-27T08:00:00.000Z' }],
  }
}

function createDummyCalculationRecord(id: string, title: string): CalculationRecord {
  return {
    id,
    createdAt: '2026-08-27T08:00:00.000Z',
    display: { title, color: 'blue-500' },
    type: 'reconstitution',
    versions: {
      reconstitutionEngineVersion: '1.0.0',
      datasetVersion: 1,
    },
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

describe('Storage Concurrency & Serialization (§11, E6.4)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsentForTesting(true)
    await resetStorageForTesting()
  })

  it('7.1: dois puts concorrentes não causam lost update na memória nem no IDB', async () => {
    const scA = createDummyScenario('sc-conc-a', 'Cenário A')
    const scB = createDummyScenario('sc-conc-b', 'Cenário B')

    await Promise.all([
      putToStore('scenarios', scA),
      putToStore('scenarios', scB),
    ])

    // Memória contém ambos
    const configMem = await loadConfigPayload()
    const idsMem = configMem.scenarios.map((s) => s.id)
    expect(idsMem).toContain('sc-conc-a')
    expect(idsMem).toContain('sc-conc-b')

    // IDB físico contém ambos
    const rawList = await readRawStore<Scenario>(indexedDB, 'scenarios')
    const rawIds = rawList.map((s) => s.id)
    expect(rawIds).toContain('sc-conc-a')
    expect(rawIds).toContain('sc-conc-b')

    // Reset da sessão e reload confirmam ambos
    resetStorageSessionForTesting()
    const reloaded = await loadConfigPayload()
    expect(reloaded.scenarios).toHaveLength(2)
  })

  it('7.2: 20 mutations concorrentes distintas são serializadas sem perda de dados', async () => {
    const scenarios = Array.from({ length: 20 }, (_, i) =>
      createDummyScenario(`sc-stress-${i + 1}`, `Cenário ${i + 1}`),
    )

    await Promise.all(scenarios.map((sc) => putToStore('scenarios', sc)))

    const config = await loadConfigPayload()
    expect(config.scenarios).toHaveLength(20)

    const rawList = await readRawStore<Scenario>(indexedDB, 'scenarios')
    expect(rawList).toHaveLength(20)
  })

  it('7.3: múltiplos addCalculationRecord concorrentes recebem insertionOrder único físico e preservam FIFO', async () => {
    const recA = createDummyCalculationRecord('rec-c-1', 'Cálculo 1')
    const recB = createDummyCalculationRecord('rec-c-2', 'Cálculo 2')
    const recC = createDummyCalculationRecord('rec-c-3', 'Cálculo 3')

    const results = await Promise.all([
      addCalculationRecord(recA),
      addCalculationRecord(recB),
      addCalculationRecord(recC),
    ])

    expect(results.every((r) => r.ok)).toBe(true)

    // Leitura pública em memória
    const list = await getCalculationRecords()
    expect(list).toHaveLength(3)

    // IDs devem ser todos distintos
    const ids = list.map((r) => r.id)
    expect(new Set(ids).size).toBe(3)

    // Leitura física no IndexedDB
    const rawHistory = await readRawStore<StoredHistoryEntry>(indexedDB, 'history')
    expect(rawHistory).toHaveLength(3)
    const orders = rawHistory.map((e) => e.insertionOrder)
    expect(new Set(orders).size).toBe(3)
    expect([...orders].sort((a, b) => a - b)).toEqual([1, 2, 3])
    expect(orders.every((o) => Number.isSafeInteger(o) && o > 0)).toBe(true)

    // Recarrega de sessão zerada
    resetStorageSessionForTesting()
    const reloaded = await getCalculationRecords()
    expect(reloaded.map((r) => r.id)).toEqual(ids)
  })

  it('7.4: mutation que aborta não bloqueia a fila para mutações subsequentes', async () => {
    const scOk1 = createDummyScenario('sc-ok-1', 'Cenário OK 1')
    const scBad = createDummyScenario('sc-bad', 'Cenário Invalido')
    const scOk2 = createDummyScenario('sc-ok-2', 'Cenário OK 2')

    // Muta com payload inválido de propósito através de mutateConfigPayload
    const [res1, resBad, res2] = await Promise.allSettled([
      putToStore('scenarios', scOk1),
      mutateConfigPayload((cfg) => ({
        ...cfg,
        scenarios: [...cfg.scenarios, { ...scBad, displayUnit: 'invalid_unit' as unknown as Scenario['displayUnit'] }],
      })),
      putToStore('scenarios', scOk2),
    ])

    expect(res1.status).toBe('fulfilled')
    expect(resBad.status).toBe('fulfilled')
    if (resBad.status === 'fulfilled') {
      expect(resBad.value.ok).toBe(false)
    }
    expect(res2.status).toBe('fulfilled')

    const config = await loadConfigPayload()
    const ids = config.scenarios.map((s) => s.id)
    expect(ids).toContain('sc-ok-1')
    expect(ids).toContain('sc-ok-2')
    expect(ids).not.toContain('sc-bad')
  })

  it('7.5: DEADLOCK PREVENTION: primeira mutação com corrupção no IDB completa sem travar (§11, E6.4)', async () => {
    // Injeta cenário corrompido diretamente no IDB
    const db = await openRawDatabase(indexedDB)
    const tx = db.transaction('scenarios', 'readwrite')
    tx.objectStore('scenarios').put({ id: 'sc-corrupt-init', badPayload: true })
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    // Reseta sessão em memória
    resetStorageSessionForTesting()

    // Dispara mutation diretamente SEM leitura prévia
    const rec = createDummyCalculationRecord('rec-deadlock-test', 'Rec Anti Deadlock')
    const addPromise = addCalculationRecord(rec)

    // Deve resolver rapidamente sem deadlock
    const result = await Promise.race([
      addPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_DEADLOCK_DETECTED')), 3000)),
    ])

    expect(result.ok).toBe(true)

    // Corrupção foi quarentenada
    const quarantine = await getQuarantineItems()
    expect(quarantine).toHaveLength(1)
    expect(quarantine[0].source).toBe('idb_corruption')

    // Registro histórico foi salvo
    const history = await getCalculationRecords()
    expect(history).toHaveLength(1)
    expect(history[0].id).toBe('rec-deadlock-test')
  })

  it('7.6: DEADLOCK PREVENTION: múltiplas corrupções em stores distintas durante primeira mutação (§11, E6.4)', async () => {
    // Injeta corrupção em scenarios, protocols e custom
    const db = await openRawDatabase(indexedDB)
    const tx = db.transaction(['scenarios', 'protocols', 'custom'], 'readwrite')
    tx.objectStore('scenarios').put({ id: 'sc-bad-multi', invalid: 1 })
    tx.objectStore('protocols').put({ id: 'pr-bad-multi', invalid: 2 })
    tx.objectStore('custom').put({ key: 'fk:v1:settings', value: { badSettings: true } })
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
    })

    resetStorageSessionForTesting()

    const mutateRes = await mutateConfigPayload((cfg) => ({
      ...cfg,
      scenarios: [...cfg.scenarios, createDummyScenario('sc-new-valid', 'New Valid')],
    }))


    expect(mutateRes.ok).toBe(true)

    const quarantine = await getQuarantineItems()
    expect(quarantine.length).toBeGreaterThanOrEqual(2)

    const config = await loadConfigPayload()
    expect(config.scenarios.some((s) => s.id === 'sc-new-valid')).toBe(true)
  })

  it('6.2: mutação durante recovery não perde dirty state e sincroniza ordenadamente', async () => {
    // 1. Simula degradação
    simulateIDBFailure(true, new Error('degraded'))
    const scDegradedA = createDummyScenario('sc-deg-a', 'Cenário Deg A')
    await putToStore('scenarios', scDegradedA)
    expect(getStorageMode()).toBe('degraded-memory')
    expect(hasUnsyncedChanges()).toBe(true)

    // 2. Remove falha simulada
    simulateIDBFailure(false)

    // 3. Inicia retryStorageOpen e simultaneamente dispara novo write
    const scDegradedB = createDummyScenario('sc-deg-b', 'Cenário Deg B')
    const [retryResult] = await Promise.all([
      retryStorageOpen(),
      putToStore('scenarios', scDegradedB),
    ])

    expect(retryResult).toBe(true)
    expect(getStorageMode()).toBe('persistent-ok')
    expect(hasUnsyncedChanges()).toBe(false)

    // 4. Reset de sessão e leitura física direta no IDB
    resetStorageSessionForTesting()
    const raw = await readRawStore<Scenario>(indexedDB, 'scenarios')
    const rawIds = raw.map((s) => s.id)
    expect(rawIds).toContain('sc-deg-a')
    expect(rawIds).toContain('sc-deg-b')
  })
})
