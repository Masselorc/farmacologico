import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  disablePersistenceAndClear,
  getPersistenceConsent,
  resetPersistenceConsentForTesting,
  setPersistenceConsent,
  subscribePersistenceConsent,
} from '../../storage/consent'

describe('Persistence Consent Management (§10, §11)', () => {
  beforeEach(() => {
    resetPersistenceConsentForTesting()
  })

  it('inicia desativado por padrão (opt-in)', () => {
    expect(getPersistenceConsent()).toBe(false)
  })

  it('permite ativar e desativar o consentimento explicitamente', () => {
    setPersistenceConsent(true)
    expect(getPersistenceConsent()).toBe(true)

    setPersistenceConsent(false)
    expect(getPersistenceConsent()).toBe(false)
  })

  it('notifica listeners registrados sobre mudanças de estado', () => {
    const listener = vi.fn()
    const unsubscribe = subscribePersistenceConsent(listener)

    setPersistenceConsent(true)
    expect(listener).toHaveBeenCalledWith(true)

    setPersistenceConsent(false)
    expect(listener).toHaveBeenCalledWith(false)

    unsubscribe()
    setPersistenceConsent(true)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('disablePersistenceAndClear desativa o consentimento e executa o callback de limpeza', async () => {
    setPersistenceConsent(true)
    expect(getPersistenceConsent()).toBe(true)

    const clearFn = vi.fn().mockResolvedValue(undefined)
    await disablePersistenceAndClear(clearFn)

    expect(getPersistenceConsent()).toBe(false)
    expect(clearFn).toHaveBeenCalledTimes(1)
  })
})
