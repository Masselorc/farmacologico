import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, CustomSubstance, Protocol, Scenario } from '../../domain/types'
import {
  addCalculationRecord,
  disablePersistenceAndPurge,
  enablePersistence,
  getCalculationRecords,
  getLastStorageError,
  getPersistenceConsent,
  getStorageMode,
  isStorageDegraded,
  loadConfigPayload,
  mutateConfigPayload,
} from '../../storage'
import {
  putToStore,
  resetPersistenceConsentForTesting,
  resetStorageForTesting,
  resetStorageSessionForTesting,
  setCustomIDBFactoryForTesting,
  setCustomStorageForTesting,
  simulateIDBFailure,
} from '../../storage/testing'
import { createFaultController, readRawStore } from './idb-faults'

const dummyScenario: Scenario = {
  id: 'sc-enable-1',
  name: 'Cenário Memory-Only',
  color: '#2563eb',
  source: {
    type: 'manual',
    pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null },
  },
  displayUnit: 'mg',
  selectedPkParameters: { halfLifeMs: 43200000, tmaxMs: null },
  doses: [{ id: 'd1', amountMg: 50, time: '2026-08-27T08:00:00.000Z' }],
}

const dummyProtocol: Protocol = {
  id: 'pr-enable-1',
  name: 'Protocolo Memory-Only',
  totalDoseMg: 100,
  schedule: {
    startDate: '2026-08-27',
    localTime: '08:00',
    timeZone: 'America/Sao_Paulo',
    recurrence: { type: 'single' },
  },
  components: [
    {
      id: 'cmp-1',
      label: 'Comp 1',
      proportion: 1,
      source: { type: 'manual' },
      selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
      pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
      displayColor: { paletteColor: '#2563eb' },
    },
  ],
  createdAt: '2026-08-27T08:00:00.000Z',
  updatedAt: '2026-08-27T08:00:00.000Z',
}

const dummySubstance: CustomSubstance = {
  id: 'sub-enable-1',
  slug: 'sub-enable-1',
  name: 'Substância Memory-Only',
  aliases: [],
  category: 'peptide',
  tags: [],
  createdAt: '2026-08-27T08:00:00.000Z',
  updatedAt: '2026-08-27T08:00:00.000Z',
}

const dummyRecord: CalculationRecord = {
  id: 'rec-enable-1',
  createdAt: '2026-08-27T08:00:00.000Z',
  display: { title: 'Cálculo Memory-Only', color: '#2563eb' },
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

describe('Enable Persistence & LocalStorage Fault Resilience (§10, §11, E6.4)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    resetPersistenceConsentForTesting()
    await resetStorageForTesting()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setCustomStorageForTesting(undefined)
  })

  it('ativação atômica de persistência migra o estado memory-only completo para o IndexedDB', async () => {
    expect(getPersistenceConsent()).toBe(false)
    expect(getStorageMode()).toBe('memory-only-consent-off')

    // 1. Cria dados enquanto consent = false (vivem apenas na memória)
    await putToStore('scenarios', dummyScenario)
    await putToStore('protocols', dummyProtocol)
    await mutateConfigPayload((cfg) => ({
      ...cfg,
      customSubstances: [dummySubstance],
    }))
    const addRes = await addCalculationRecord(dummyRecord)
    expect(addRes.ok).toBe(true)

    // O IDB físico ainda está vazio
    const rawBefore = await readRawStore<Scenario>(indexedDB, 'scenarios')
    expect(rawBefore).toHaveLength(0)

    // 2. Chama enablePersistence()
    await enablePersistence()
    expect(getPersistenceConsent()).toBe(true)
    expect(getStorageMode()).toBe('persistent-ok')

    // 3. O IDB físico agora contém todos os dados
    const rawScenarios = await readRawStore<Scenario>(indexedDB, 'scenarios')
    expect(rawScenarios).toHaveLength(1)
    expect(rawScenarios[0].id).toBe('sc-enable-1')

    const rawProtocols = await readRawStore<Protocol>(indexedDB, 'protocols')
    expect(rawProtocols).toHaveLength(1)

    // 4. Reinicia a sessão em memória e recarrega do IDB
    resetStorageSessionForTesting()
    const reloadedConfig = await loadConfigPayload()
    expect(reloadedConfig.scenarios).toHaveLength(1)
    expect(reloadedConfig.protocols).toHaveLength(1)
    expect(reloadedConfig.customSubstances).toHaveLength(1)

    const reloadedHistory = await getCalculationRecords()
    expect(reloadedHistory).toHaveLength(1)
    expect(reloadedHistory[0].id).toBe('rec-enable-1')
  })

  it('rollback em caso de falha de transação durante enablePersistence', async () => {
    expect(getPersistenceConsent()).toBe(false)

    await putToStore('scenarios', dummyScenario)
    await addCalculationRecord(dummyRecord)

    const faults = createFaultController(indexedDB)
    setCustomIDBFactoryForTesting(faults.factory)
    faults.arm({ kind: 'transaction-abort', operation: 'put', store: 'scenarios' })

    await expect(enablePersistence()).rejects.toBeDefined()

    // Consentimento continua false
    expect(getPersistenceConsent()).toBe(false)
    // Dados continuam íntegros e acessíveis em memória
    const config = await loadConfigPayload()
    expect(config.scenarios).toHaveLength(1)
    const history = await getCalculationRecords()
    expect(history).toHaveLength(1)
  })

  it('falha ao gravar no localStorage durante enablePersistence compensa o IDB e mantém consent=false (§10, E6.4)', async () => {
    expect(getPersistenceConsent()).toBe(false)
    await putToStore('scenarios', dummyScenario)
    await addCalculationRecord(dummyRecord)

    const failingStorage: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => { throw new Error('QuotaExceededError in localStorage') },
    }
    setCustomStorageForTesting(failingStorage)

    await expect(enablePersistence()).rejects.toThrow('Falha ao gravar consentimento no localStorage')
    expect(getPersistenceConsent()).toBe(false)

    // Dados continuam íntegros na sessão corrente em memória
    const memConfig = await loadConfigPayload()
    expect(memConfig.scenarios).toHaveLength(1)
    const memHistory = await getCalculationRecords()
    expect(memHistory).toHaveLength(1)

    // Mas o IDB físico foi limpo pela compensação e NÃO contém os dados
    const rawScenarios = await readRawStore<Scenario>(indexedDB, 'scenarios')
    expect(rawScenarios).toHaveLength(0)
    const rawHistory = await readRawStore<CalculationRecord>(indexedDB, 'history')
    expect(rawHistory).toHaveLength(0)

    // Nova sessão com consent=false não ressuscita dados persistidos
    resetStorageSessionForTesting()
    const emptyConfig = await loadConfigPayload()
    expect(emptyConfig.scenarios).toHaveLength(0)
  })

  it('disablePersistenceAndPurge com fallback removeItem quando setItem falha (§10, E6.4)', async () => {
    await enablePersistence()
    expect(getPersistenceConsent()).toBe(true)
    await putToStore('scenarios', dummyScenario)

    let itemRemoved = false
    const fallbackStorage: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => 'true',
      key: () => null,
      removeItem: () => { itemRemoved = true },
      setItem: () => { throw new Error('LocalStorage setItem blocked') },
    }
    setCustomStorageForTesting(fallbackStorage)

    // Não deve lançar erro porque removeItem funcionou como fallback adequado
    await disablePersistenceAndPurge()

    expect(itemRemoved).toBe(true)
    expect(getPersistenceConsent()).toBe(false)

    // IDB físico está limpo
    const raw = await readRawStore<Scenario>(indexedDB, 'scenarios')
    expect(raw).toHaveLength(0)
  })

  it('disablePersistenceAndPurge com falha total de localStorage mantém sessão false e propaga erro (§10, E6.4)', async () => {
    await enablePersistence()
    expect(getPersistenceConsent()).toBe(true)
    await putToStore('scenarios', dummyScenario)

    const totalFailingStorage: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => 'true',
      key: () => null,
      removeItem: () => { throw new Error('LocalStorage removeItem blocked') },
      setItem: () => { throw new Error('LocalStorage setItem blocked') },
    }
    setCustomStorageForTesting(totalFailingStorage)

    await expect(disablePersistenceAndPurge()).rejects.toThrow('Falha ao gravar revogação de consentimento')

    // Sessão continua false incondicionalmente
    expect(getPersistenceConsent()).toBe(false)

    // IDB físico foi purgado com sucesso
    const raw = await readRawStore<Scenario>(indexedDB, 'scenarios')
    expect(raw).toHaveLength(0)
  })

  it('falha simultânea no localStorage e no rollback físico propaga AggregateError observável (§10, §11, E6.5)', async () => {
    expect(getPersistenceConsent()).toBe(false)
    await putToStore('scenarios', dummyScenario)
    await addCalculationRecord(dummyRecord)

    // Configura storage com setItem que bloqueia o IDB e depois falha
    const failingStorage: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => {
        simulateIDBFailure(true, new Error('IDB unavailable during compensation'))
        throw new Error('localStorage write failed')
      },
    }
    setCustomStorageForTesting(failingStorage)

    let caughtError: unknown = null
    try {
      await enablePersistence()
    } catch (err) {
      caughtError = err
    }

    expect(caughtError).toBeInstanceOf(AggregateError)
    const agg = caughtError as AggregateError
    expect(agg.errors).toHaveLength(2)
    expect(agg.errors[0].message).toContain('localStorage write failed')
    expect(agg.errors[1].message).toContain('IDB unavailable during compensation')

    // Invariantes fundamentais
    expect(getPersistenceConsent()).toBe(false)
    expect(isStorageDegraded()).toBe(true)
    expect(getLastStorageError()).not.toBeNull()

    // Memória ativa não foi perdida
    const memConfig = await loadConfigPayload()
    expect(memConfig.scenarios).toHaveLength(1)
    const memHistory = await getCalculationRecords()
    expect(memHistory).toHaveLength(1)

    // Desativa falha simulada apenas para inspeção física direta
    simulateIDBFailure(false)
    const rawScenarios = await readRawStore<Scenario>(indexedDB, 'scenarios')
    expect(rawScenarios.length).toBeGreaterThanOrEqual(1)
  })
})
