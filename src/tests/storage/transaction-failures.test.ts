import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, ConfigPayload, Scenario, StoredHistoryEntry } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import { addCalculationRecord, getCalculationRecords } from '../../storage/history'
import { mutateConfigPayload } from '../../storage/config'
import {
  clearStore, deleteFromStore, getAllFromStore, getDefaultFavorites, getDefaultSettings,
  getStorageMode, loadConfigPayload, putToStore, resetStorageForTesting,
  restoreFullBackup, retryStorageOpen, saveConfigPayload, setCustomIDBFactoryForTesting,
  replaceConfigAndPruneHistory,
} from '../../storage/idb'
import { createFaultController, readRawStore } from './idb-faults'

const scenarioA: Scenario = {
  id: 'scenario-a', name: 'A', color: '#2563eb', source: { type: 'manual',
    pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null } },
  displayUnit: 'mg', selectedPkParameters: { halfLifeMs: 43_200_000, tmaxMs: null }, doses: [],
}
const scenarioB: Scenario = { ...scenarioA, id: 'scenario-b', name: 'B' }
const scenarioANew: Scenario = { ...scenarioA, name: 'A novo' }

function config(scenarios: Scenario[]): ConfigPayload {
  return { settings: getDefaultSettings(), favorites: getDefaultFavorites(), customSubstances: [],
    customProfiles: [], recipes: [], scenarios, protocols: [] }
}

function record(id: string, title: string): CalculationRecord {
  return {
    id, createdAt: '2026-08-27T08:00:00.000Z', display: { title, color: '#2563eb' },
    type: 'reconstitution', versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
    input: { vialMassMg: 10, diluentVolumeMl: 2, desiredDoseMcg: 100,
      syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 } },
    resultSnapshot: { concentrationMcgPerMl: 5000, doseVolumeMl: 0.02, syringeUnits: 2,
      theoreticalMaxDoses: 100, capacityExceeded: false, warnings: [],
      metadata: { reconstitutionEngineVersion: '1.0.0' } },
  }
}

describe('Request failures, transaction aborts and rollback (E6.2)', () => {
  const faults = createFaultController(indexedDB)

  beforeEach(async () => {
    faults.disarm()
    setCustomIDBFactoryForTesting(faults.factory)
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('mantém put em memória degradada e o reaplica após request failure real', async () => {
    await putToStore('scenarios', scenarioA)
    faults.arm({ kind: 'request-error', operation: 'put', store: 'scenarios', duplicateValue: scenarioA })
    await expect(putToStore('scenarios', scenarioANew)).rejects.toBeDefined()
    expect(getStorageMode()).toBe('degraded-memory')
    expect((await getAllFromStore<Scenario>('scenarios'))[0].name).toBe('A novo')
    expect(await retryStorageOpen()).toBe(true)
    expect((await readRawStore<Scenario>(indexedDB, 'scenarios'))[0].name).toBe('A novo')
  })

  it('não declara sucesso quando request sucede e a transaction aborta', async () => {
    await putToStore('scenarios', scenarioA)
    faults.arm({ kind: 'transaction-abort', operation: 'put', store: 'scenarios' })
    await expect(putToStore('scenarios', scenarioANew)).rejects.toBeDefined()
    expect(getStorageMode()).toBe('degraded-memory')
    expect((await getAllFromStore<Scenario>('scenarios'))[0]).toEqual(scenarioANew)
    expect(await retryStorageOpen()).toBe(true)
    expect((await readRawStore<Scenario>(indexedDB, 'scenarios'))[0]).toEqual(scenarioANew)
  })

  it('mantém delete esperado na sessão e o recupera após falha real', async () => {
    await putToStore('scenarios', scenarioA)
    faults.arm({ kind: 'request-error', operation: 'delete', store: 'scenarios', duplicateValue: scenarioA })
    await expect(deleteFromStore('scenarios', scenarioA.id)).rejects.toBeDefined()
    expect(await getAllFromStore<Scenario>('scenarios')).toHaveLength(0)
    expect(await retryStorageOpen()).toBe(true)
    expect(await readRawStore<Scenario>(indexedDB, 'scenarios')).toHaveLength(0)
  })

  it('mantém clear esperado na sessão e o recupera após falha real', async () => {
    await putToStore('scenarios', scenarioA); await putToStore('scenarios', scenarioB)
    faults.arm({ kind: 'request-error', operation: 'clear', store: 'scenarios', duplicateValue: scenarioA })
    await expect(clearStore('scenarios')).rejects.toBeDefined()
    expect(await getAllFromStore<Scenario>('scenarios')).toHaveLength(0)
    expect(await retryStorageOpen()).toBe(true)
    expect(await readRawStore<Scenario>(indexedDB, 'scenarios')).toHaveLength(0)
  })

  it('faz rollback integral de saveConfigPayload quando a transaction aborta', async () => {
    await saveConfigPayload(config([scenarioA]))
    faults.arm({ kind: 'transaction-abort', operation: 'clear', store: 'scenarios' })
    await expect(saveConfigPayload(config([scenarioB]))).rejects.toBeDefined()
    expect((await loadConfigPayload()).scenarios).toEqual([scenarioA])
    expect(await readRawStore<Scenario>(indexedDB, 'scenarios')).toEqual([scenarioA])
  })

  it('faz mutateConfigPayload rejeitar sem trocar Config ativo quando a transaction aborta', async () => {
    await saveConfigPayload(config([scenarioA]))
    faults.arm({ kind: 'transaction-abort', operation: 'clear', store: 'scenarios' })
    await expect(mutateConfigPayload(() => config([scenarioB]))).rejects.toBeDefined()
    expect((await loadConfigPayload()).scenarios).toEqual([scenarioA])
    expect(await readRawStore<Scenario>(indexedDB, 'scenarios')).toEqual([scenarioA])
  })

  it('faz rollback de memória e IDB quando restoreFullBackup aborta', async () => {
    const historyA = record('history-a', 'Histórico A')
    await saveConfigPayload(config([scenarioA])); await addCalculationRecord(historyA)
    faults.arm({ kind: 'transaction-abort', operation: 'clear', store: 'scenarios' })
    await expect(restoreFullBackup(config([scenarioB]), [record('history-b', 'Histórico B')])).rejects.toBeDefined()
    expect((await loadConfigPayload()).scenarios).toEqual([scenarioA])
    expect(await getCalculationRecords()).toEqual([historyA])
    expect(await readRawStore<Scenario>(indexedDB, 'scenarios')).toEqual([scenarioA])
    const rawHistory = await readRawStore<StoredHistoryEntry>(indexedDB, 'history')
    expect(rawHistory.map((entry) => entry.record)).toEqual([historyA])
  })

  it('faz rollback conjunto de Config e poda de history na mesma transaction', async () => {
    const h1 = record('h1', 'A1'); const h2 = record('h2', 'A2'); const h3 = record('h3', 'A3')
    await saveConfigPayload(config([scenarioA]))
    await addCalculationRecord(h1); await addCalculationRecord(h2); await addCalculationRecord(h3)
    faults.arm({ kind: 'transaction-abort', operation: 'delete', store: 'history' })

    await expect(replaceConfigAndPruneHistory(config([scenarioB]), ['h1'])).rejects.toBeDefined()
    expect((await loadConfigPayload()).scenarios).toEqual([scenarioA])
    expect((await getCalculationRecords()).map((value) => value.id)).toEqual(['h3', 'h2', 'h1'])
    expect(await readRawStore<Scenario>(indexedDB, 'scenarios')).toEqual([scenarioA])
    const rawHistory = await readRawStore<StoredHistoryEntry>(indexedDB, 'history')
    expect(rawHistory.map((entry) => entry.id).sort()).toEqual(['h1', 'h2', 'h3'])
  })
})
