import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { Scenario } from '../../domain/types'
import {
  detectInitialCalendarTimeZone,
  disablePersistenceAndPurge,
  getPersistenceConsent,
  resetPersistenceConsentForTesting,
  setPersistenceConsent,
  subscribePersistenceConsent,
} from '../../storage/consent'
import {
  getFromStore,
  loadConfigPayload,
  putToStore,
  resetStorageForTesting,
  setCustomIDBFactoryForTesting,
  simulateIDBFailure,
} from '../../storage/idb'

import { createFaultController, readRawStore } from './idb-faults'

const dummyScenario: Scenario = {
  id: 'sc-purge-test',
  name: 'Purge Scenario',
  color: 'blue-500',
  source: {
    type: 'manual',
    pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null },
  },
  displayUnit: 'mg',
  selectedPkParameters: { halfLifeMs: 43200000, tmaxMs: null },
  doses: [{ id: 'd1', amountMg: 50, time: '2026-08-27T08:00:00.000Z' }],
}

describe('Consent & TimeZone Detection (§10, §11, E6.1)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    resetPersistenceConsentForTesting()
    await resetStorageForTesting()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('inicia desativado por padrão (opt-in)', () => {
    expect(getPersistenceConsent()).toBe(false)
  })

  it('permite ativar, desativar e notifica listeners inscritos', () => {
    const events: boolean[] = []
    const unsubscribe = subscribePersistenceConsent((val) => events.push(val))

    setPersistenceConsent(true)
    expect(getPersistenceConsent()).toBe(true)

    setPersistenceConsent(false)
    expect(getPersistenceConsent()).toBe(false)

    expect(events).toEqual([true, false])
    unsubscribe()
  })

  it('detecta o fuso horário inicial a partir do dispositivo e faz fallback para UTC se inválido', () => {
    // 1. Mock com fuso de Manaus
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
    spy.mockReturnValue({
      locale: 'pt-BR',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/Manaus',
    })
    expect(detectInitialCalendarTimeZone()).toBe('America/Manaus')

    // 2. Mock com fuso de Lisboa
    spy.mockReturnValue({
      locale: 'pt-PT',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'Europe/Lisbon',
    })
    expect(detectInitialCalendarTimeZone()).toBe('Europe/Lisbon')

    // 3. Mock com fuso de Tóquio
    spy.mockReturnValue({
      locale: 'ja-JP',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'Asia/Tokyo',
    })
    expect(detectInitialCalendarTimeZone()).toBe('Asia/Tokyo')

    // 4. Mock com fuso inválido => Fallback para UTC
    spy.mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'Invalid/NonExistent_Zone',
    })
    expect(detectInitialCalendarTimeZone()).toBe('UTC')
  })

  it('CORREÇÃO 1: desativar persistência com purge real apaga fisicamente o IndexedDB', async () => {
    // 1. Consentimento ativado
    setPersistenceConsent(true)
    expect(getPersistenceConsent()).toBe(true)

    // 2. Gravar dados no IDB
    await putToStore('scenarios', dummyScenario)
    const fetchedBefore = await getFromStore<Scenario>('scenarios', dummyScenario.id)
    expect(fetchedBefore).toEqual(dummyScenario)

    // 3. Desativar persistência através de disablePersistenceAndPurge
    await disablePersistenceAndPurge()

    // 4. Consentimento deve ser false
    expect(getPersistenceConsent()).toBe(false)

    // 5. Reativar consentimento e conferir que o IndexedDB continua vazio
    setPersistenceConsent(true)
    const fetchedAfter = await getFromStore<Scenario>('scenarios', dummyScenario.id)
    expect(fetchedAfter).toBeUndefined()

    const config = await loadConfigPayload()
    expect(config.scenarios).toHaveLength(0)
  })

  it('mantém consentimento e memória quando a abertura para purge falha', async () => {
    setPersistenceConsent(true)
    await putToStore('scenarios', dummyScenario)
    simulateIDBFailure(true, new Error('purge open failure'))

    await expect(disablePersistenceAndPurge()).rejects.toThrow('purge open failure')
    expect(getPersistenceConsent()).toBe(true)
    expect(await getFromStore<Scenario>('scenarios', dummyScenario.id)).toEqual(dummyScenario)

    simulateIDBFailure(false)
    expect(await readRawStore<Scenario>(indexedDB, 'scenarios')).toEqual([dummyScenario])
  })

  it('mantém consentimento, memória e IDB quando a transaction de purge aborta', async () => {
    setPersistenceConsent(true)
    await putToStore('scenarios', dummyScenario)
    const faults = createFaultController(indexedDB)
    setCustomIDBFactoryForTesting(faults.factory)
    faults.arm({ kind: 'transaction-abort', operation: 'clear', store: 'scenarios' })

    await expect(disablePersistenceAndPurge()).rejects.toBeDefined()
    expect(getPersistenceConsent()).toBe(true)
    expect(await getFromStore<Scenario>('scenarios', dummyScenario.id)).toEqual(dummyScenario)
    expect(await readRawStore<Scenario>(indexedDB, 'scenarios')).toEqual([dummyScenario])
  })

})
