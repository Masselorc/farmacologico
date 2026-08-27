import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, Scenario } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import { exportCurrentFullBackup } from '../../storage/export'
import { addCalculationRecord, getCalculationRecords } from '../../storage/history'
import {
  getAllFromStore, getStorageMode, putToStore, resetStorageForTesting,
  resetStorageSessionForTesting, retryStorageOpen, setCustomIDBFactoryForTesting,
  getDefaultFavorites, getDefaultSettings, restoreFullBackup, simulateIDBFailure,
} from '../../storage/idb'
import { createFaultController, readRawStore } from './idb-faults'

const scenario = (id: string, name: string): Scenario => ({
  id, name, color: 'blue-500', source: { type: 'manual',
    pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null } },
  displayUnit: 'mg', selectedPkParameters: { halfLifeMs: 43_200_000, tmaxMs: null }, doses: [],
})

const record = (id: string): CalculationRecord => ({
  id, createdAt: '2026-08-27T08:00:00.000Z', display: { title: id, color: 'blue-500' },
  type: 'reconstitution', versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
  input: { vialMassMg: 10, diluentVolumeMl: 2, desiredDoseMcg: 100,
    syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 } },
  resultSnapshot: { concentrationMcgPerMl: 5000, doseVolumeMl: 0.02, syringeUnits: 2,
    theoreticalMaxDoses: 100, capacityExceeded: false, warnings: [],
    metadata: { reconstitutionEngineVersion: '1.0.0' } },
})

describe('Recovery seguro e memória degradada autoritativa (E6.2)', () => {
  const faults = createFaultController(indexedDB)

  beforeEach(async () => {
    faults.disarm(); setCustomIDBFactoryForTesting(faults.factory)
    setPersistenceConsent(true); await resetStorageForTesting()
  })

  it('preserva dados IDB não consultados pela aplicação e reaplica apenas o scenario alterado', async () => {
    await putToStore('scenarios', scenario('a', 'A antigo'))
    await putToStore('scenarios', scenario('b', 'B preservado'))
    await addCalculationRecord(record('h1')); await addCalculationRecord(record('h2'))

    // Simula reload: nenhum reader da aplicação consultou history nesta sessão.
    resetStorageSessionForTesting()
    faults.arm({ kind: 'transaction-abort', operation: 'put', store: 'scenarios' })
    await expect(putToStore('scenarios', scenario('a', 'A novo'))).rejects.toBeDefined()
    expect(getStorageMode()).toBe('degraded-memory')

    const duringFailure = await getAllFromStore<Scenario>('scenarios')
    expect(duringFailure.find((value) => value.id === 'a')?.name).toBe('A novo')
    expect(duringFailure.find((value) => value.id === 'b')?.name).toBe('B preservado')
    expect((await getCalculationRecords()).map((value) => value.id)).toEqual(['h2', 'h1'])

    expect(await retryStorageOpen()).toBe(true)
    resetStorageSessionForTesting()
    const recoveredScenarios = await getAllFromStore<Scenario>('scenarios')
    expect(recoveredScenarios.find((value) => value.id === 'a')?.name).toBe('A novo')
    expect(recoveredScenarios.find((value) => value.id === 'b')?.name).toBe('B preservado')
    expect((await getCalculationRecords()).map((value) => value.id)).toEqual(['h2', 'h1'])
    expect(await readRawStore(indexedDB, 'history')).toHaveLength(2)
  })

  it('não volta ao IDB stale durante degraded-memory e mantém round-trip lógico no retry', async () => {
    await putToStore('scenarios', scenario('a', 'A antigo'))
    resetStorageSessionForTesting()
    faults.arm({ kind: 'transaction-abort', operation: 'put', store: 'scenarios' })
    await expect(putToStore('scenarios', scenario('a', 'A novo'))).rejects.toBeDefined()

    const beforeRetry = await exportCurrentFullBackup('2026-08-27T12:00:00.000Z')
    expect(beforeRetry.ok).toBe(true)
    if (!beforeRetry.ok) return
    expect(beforeRetry.bundle.payload.scenarios[0].name).toBe('A novo')

    expect(await retryStorageOpen()).toBe(true)
    const afterRetry = await exportCurrentFullBackup('2026-08-27T12:00:00.000Z')
    expect(afterRetry.ok).toBe(true)
    if (!afterRetry.ok) return
    expect(afterRetry.bundle).toEqual(beforeRetry.bundle)
  })

  it('registra restore completo como operação dirty atômica durante degradação', async () => {
    await putToStore('scenarios', scenario('a', 'A'))
    simulateIDBFailure(true, new Error('offline'))
    await restoreFullBackup({
      settings: getDefaultSettings(), favorites: getDefaultFavorites(), customSubstances: [],
      customProfiles: [], recipes: [], scenarios: [scenario('b', 'B')], protocols: [],
    }, [record('history-b')])
    const during = await exportCurrentFullBackup('2026-08-27T12:00:00.000Z')
    expect(during.ok).toBe(true)
    if (!during.ok) return
    expect(during.bundle.payload.scenarios.map((value) => value.id)).toEqual(['b'])
    expect(during.bundle.history.map((value) => value.id)).toEqual(['history-b'])

    simulateIDBFailure(false)
    expect(await retryStorageOpen()).toBe(true)
    const after = await exportCurrentFullBackup('2026-08-27T12:00:00.000Z')
    expect(after.ok).toBe(true)
    if (after.ok) expect(after.bundle).toEqual(during.bundle)
  })
})
