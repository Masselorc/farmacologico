import { beforeEach, describe, expect, it } from 'vitest'
import type { Scenario } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import {
  clearAllStores,
  createMockIDBFactory,
  deleteFromStore,
  getAllFromStore,
  getFromStore,
  getLastStorageError,
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

describe('IndexedDB Storage & Memory Degradation (§11)', () => {
  beforeEach(async () => {
    setPersistenceConsent(true)
    setCustomIDBFactoryForTesting(createMockIDBFactory())
    await resetStorageForTesting()
  })


  it('permite operações CRUD básicas em stores', async () => {
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

  it('opera em memória e relata estado degradado quando IndexedDB falha', async () => {
    simulateIDBFailure(true, new Error('Disk full error'))

    expect(isStorageDegraded()).toBe(true)
    expect(getLastStorageError()?.message).toBe('Disk full error')

    // Gravação e leitura continuam funcionando em memória para a sessão
    await putToStore('scenarios', dummyScenario)
    const fetched = await getFromStore<Scenario>('scenarios', 'sc-1')
    expect(fetched).toEqual(dummyScenario)

    // Recuperação após retry quando falha cessa
    simulateIDBFailure(false)
    const recovered = await retryStorageOpen()
    expect(recovered).toBe(true)
    expect(isStorageDegraded()).toBe(false)
  })

  it('limpa todos os stores corretamente com clearAllStores', async () => {
    await putToStore('scenarios', dummyScenario)
    expect(await getAllFromStore('scenarios')).toHaveLength(1)

    await clearAllStores()
    expect(await getAllFromStore('scenarios')).toHaveLength(0)
  })
})
