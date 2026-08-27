import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, CustomSubstance, Protocol, Scenario } from '../../domain/types'
import {
  addCalculationRecord,
  disablePersistenceAndPurge,
  enablePersistence,
  getCalculationRecords,
  getPersistenceConsent,
  getStorageMode,
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
} from '../../storage/testing'


import { createFaultController, readRawStore } from './idb-faults'

const dummyScenario: Scenario = {
  id: 'sc-enable-1',
  name: 'Cenário Memory-Only',
  color: 'blue-500',
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
      displayColor: { paletteColor: 'blue-500' },
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
  display: { title: 'Cálculo Memory-Only', color: 'blue-500' },
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

describe('Enable Persistence & LocalStorage Fault Resilience (§10, §11, E6.3)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    resetPersistenceConsentForTesting()
    await resetStorageForTesting()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('falha ao gravar no localStorage durante enablePersistence aborta a ativação', async () => {
    expect(getPersistenceConsent()).toBe(false)
    await putToStore('scenarios', dummyScenario)

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

    setCustomStorageForTesting(undefined)
  })

  it('falha ao gravar no localStorage durante disablePersistenceAndPurge propaga o erro', async () => {
    await enablePersistence()
    expect(getPersistenceConsent()).toBe(true)

    const failingStorage: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => { throw new Error('LocalStorage setItem blocked') },
    }
    setCustomStorageForTesting(failingStorage)

    await expect(disablePersistenceAndPurge()).rejects.toThrow('Falha ao gravar revogação de consentimento')

    setCustomStorageForTesting(undefined)
  })
})

