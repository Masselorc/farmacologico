import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { Scenario } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import {
  clearAllStores,
  deleteFromStore,
  getAllFromStore,
  getFromStore,
  getLastStorageError,
  getStorageMode,
  hasUnsyncedChanges,
  isStorageDegraded,
  loadConfigPayload,
  putToStore,
  resetStorageForTesting,
  retryStorageOpen,
  saveConfigPayload,
  setCustomIDBFactoryForTesting,
  simulateIDBFailure,
} from '../../storage/idb'

const dummyScenario: Scenario = {
  id: 'sc-1',
  name: 'Cenário Teste',
  color: 'blue-500',
  source: {
    type: 'manual',
    pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
  },
  displayUnit: 'mg',
  selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
  doses: [{ id: 'd1', amountMg: 100, time: '2026-08-27T08:00:00.000Z' }],
}

describe('IndexedDB Storage, Modes & Recovery (§11, E6.1)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('permite operações CRUD básicas em stores no modo persistent-ok', async () => {
    expect(getStorageMode()).toBe('persistent-ok')

    await putToStore('scenarios', dummyScenario)

    const fetched = await getFromStore<Scenario>('scenarios', 'sc-1')
    expect(fetched).toEqual(dummyScenario)

    const all = await getAllFromStore<Scenario>('scenarios')
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('sc-1')

    await deleteFromStore('scenarios', 'sc-1')
    const afterDelete = await getFromStore<Scenario>('scenarios', 'sc-1')
    expect(afterDelete).toBeUndefined()
  })

  it('permite salvar e carregar ConfigPayload de forma estruturada', async () => {
    const payload = await loadConfigPayload()
    payload.scenarios = [dummyScenario]
    payload.settings.theme = 'dark'

    await saveConfigPayload(payload)

    const loaded = await loadConfigPayload()
    expect(loaded.settings.theme).toBe('dark')
    expect(loaded.scenarios).toHaveLength(1)
    expect(loaded.scenarios[0].name).toBe('Cenário Teste')
  })

  it('CORREÇÃO 2: opera em memória durante falha de abertura do IDB e relata estado degradado', async () => {
    simulateIDBFailure(true, new Error('Simulated IDB Open Failure'))

    expect(isStorageDegraded()).toBe(true)
    expect(getStorageMode()).toBe('degraded-memory')
    expect(getLastStorageError()?.message).toBe('Simulated IDB Open Failure')

    // Gravação e leitura continuam funcionando na memória para a sessão
    await putToStore('scenarios', dummyScenario)
    expect(hasUnsyncedChanges()).toBe(true)

    const fetched = await getFromStore<Scenario>('scenarios', 'sc-1')
    expect(fetched).toEqual(dummyScenario)
  })

  it('CORREÇÃO 2: recovery sincroniza alterações dirty da memória para o IDB antes de retornar true', async () => {
    // 1. Simula falha do IDB
    simulateIDBFailure(true, new Error('Disk full error'))
    expect(isStorageDegraded()).toBe(true)

    // 2. Modifica dados enquanto está em modo degradado
    const updatedScenario: Scenario = {
      ...dummyScenario,
      id: 'sc-dirty-sync',
      name: 'Cenário Criado Durante Falha',
    }
    await putToStore('scenarios', updatedScenario)
    expect(hasUnsyncedChanges()).toBe(true)

    // Leitura na memória reflete o dado
    const memRead = await getFromStore<Scenario>('scenarios', 'sc-dirty-sync')
    expect(memRead?.name).toBe('Cenário Criado Durante Falha')

    // 3. Falha cessa e recovery é acionado
    simulateIDBFailure(false)
    const recovered = await retryStorageOpen()
    expect(recovered).toBe(true)
    expect(isStorageDegraded()).toBe(false)
    expect(hasUnsyncedChanges()).toBe(false)
    expect(getStorageMode()).toBe('persistent-ok')

    // 4. Nova leitura comprova que o dado foi fisicamente persistido no IDB durante a sincronização
    const idbRead = await getFromStore<Scenario>('scenarios', 'sc-dirty-sync')
    expect(idbRead?.name).toBe('Cenário Criado Durante Falha')
  })

  it('limpa todos os stores corretamente com clearAllStores', async () => {
    await putToStore('scenarios', dummyScenario)
    expect(await getAllFromStore('scenarios')).toHaveLength(1)

    await clearAllStores()
    expect(await getAllFromStore('scenarios')).toHaveLength(0)
  })
})
