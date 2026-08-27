import { beforeEach, describe, expect, it } from 'vitest'
import type { Scenario } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import { mutateConfigPayload, validateProjectedConfigPayload } from '../../storage/config'
import { loadConfigPayload, resetStorageForTesting } from '../../storage/idb'
import { SAFETY_LIMITS } from '../../validation/limits'

describe('ConfigPayload Budget & Atomic Mutation (§11, §12)', () => {
  beforeEach(async () => {
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('aceita ConfigPayload dentro do limite de 15 MiB', async () => {
    const payload = await loadConfigPayload()
    const validation = validateProjectedConfigPayload(payload)
    expect(validation.ok).toBe(true)
  })

  it('rejeita ConfigPayload que ultrapasse 15 MiB com CONFIG_STORAGE_LIMIT_EXCEEDED', () => {
    const hugeScenarios: Scenario[] = []
    // Gera dados grandes para estourar 15 MiB
    const largeStr = new Array(500).fill('a').join('')

    for (let i = 0; i < 20; i++) {
      hugeScenarios.push({
        id: `s-${i}`,
        name: `Cenário ${i} ${largeStr}`,
        color: 'blue-500',
        source: {
          type: 'manual',
          pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
        },
        displayUnit: 'mg',
        selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
        doses: Array.from({ length: 2000 }, (_, idx) => ({
          id: `d-${i}-${idx}-${largeStr}`,
          amountMg: 100,
          time: '2026-08-27T08:00:00.000Z',
        })),
      })
    }


    const payload = {
      settings: { theme: 'system' as const, calendarTimeZone: 'America/Sao_Paulo' },
      favorites: { substances: [], recipeIds: [] },
      customSubstances: [],
      customProfiles: [],
      recipes: [],
      scenarios: hugeScenarios,
      protocols: [],
    }

    const validation = validateProjectedConfigPayload(payload)
    expect(validation.ok).toBe(false)
    if (!validation.ok) {
      expect(validation.error.code).toBe('CONFIG_STORAGE_LIMIT_EXCEEDED')
      expect(validation.bytes).toBeGreaterThan(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX)
    }
  })

  it('mutateConfigPayload aplica mutação válida e persiste atomicamente', async () => {
    const res = await mutateConfigPayload((current) => ({
      ...current,
      settings: { ...current.settings, theme: 'dark' },
    }))

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.payload.settings.theme).toBe('dark')
    }

    const loaded = await loadConfigPayload()
    expect(loaded.settings.theme).toBe('dark')
  })

  it('mutateConfigPayload aborta e NÃO altera o storage quando mutação excede o budget', async () => {
    // Configura estado inicial
    await mutateConfigPayload((current) => ({
      ...current,
      settings: { ...current.settings, theme: 'light' },
    }))

    const largeStr = new Array(500).fill('x').join('')

    const hugeScenarios: Scenario[] = Array.from({ length: 20 }, (_, i) => ({
      id: `s-${i}`,
      name: `Cenário ${i}`,
      color: 'blue-500',
      source: { type: 'manual' },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
      doses: Array.from({ length: 2000 }, (_, idx) => ({
        id: `d-${i}-${idx}-${largeStr}`,
        amountMg: 100,
        time: '2026-08-27T08:00:00.000Z',
      })),
    }))


    const res = await mutateConfigPayload((current) => ({
      ...current,
      scenarios: hugeScenarios,
    }))

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('CONFIG_STORAGE_LIMIT_EXCEEDED')
    }

    // O storage deve permanecer inalterado com theme light
    const loaded = await loadConfigPayload()
    expect(loaded.settings.theme).toBe('light')
    expect(loaded.scenarios).toHaveLength(0)
  })
})
