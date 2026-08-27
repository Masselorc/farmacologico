import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, ConfigPayload, Scenario } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import { mutateConfigPayload, validateProjectedConfigPayload } from '../../storage/config'
import { addCalculationRecord, calculateProjectedFullBackupBytes, getCalculationRecords } from '../../storage/history'
import {
  getDefaultFavorites,
  getDefaultSettings,
  loadConfigPayload,
  resetStorageForTesting,
  saveConfigPayload,
  setCustomIDBFactoryForTesting,
} from '../../storage/idb'
import { SAFETY_LIMITS } from '../../validation/limits'

const baseConfig: ConfigPayload = {
  settings: getDefaultSettings(),
  favorites: getDefaultFavorites(),
  customSubstances: [],
  customProfiles: [],
  recipes: [],
  scenarios: [],
  protocols: [],
}

function createDummyCalculationRecord(id: string, paddingChars: number): CalculationRecord {
  return {
    id,
    createdAt: new Date().toISOString(),
    display: { title: `Cálculo ${id}`, color: 'blue-500', note: 'x'.repeat(paddingChars) },
    type: 'reconstitution',
    versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
    input: {
      vialMassMg: 10,
      diluentVolumeMl: 2,
      desiredDoseMcg: 500,
      syringe: {
        family: 'U-100',
        capacityUnits: 100,
        unitsPerMl: 100,
        graduationUnits: 1,
      },
    },
    resultSnapshot: {
      concentrationMcgPerMl: 5000,
      doseVolumeMl: 0.1,
      syringeUnits: 10,
      theoreticalMaxDoses: 20,
      capacityExceeded: false,
      warnings: [],
      metadata: { reconstitutionEngineVersion: '1.0.0' },
    },
  }
}


describe('Config Storage, Budgets & Auto-Pruning (§11, §12, E6.1)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('permite gravar e carregar um ConfigPayload válido', async () => {
    const scenario: Scenario = {
      id: 'sc-cfg-1',
      name: 'Cenário Config',
      color: 'purple-500',
      source: {
        type: 'manual',
        pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null },
      },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 43200000, tmaxMs: null },
      doses: [{ id: 'd1', amountMg: 50, time: '2026-08-27T08:00:00.000Z' }],
    }

    const payload: ConfigPayload = {
      ...baseConfig,
      scenarios: [scenario],
    }

    const res = await mutateConfigPayload(() => payload)
    expect(res.ok).toBe(true)

    const loaded = await loadConfigPayload()
    expect(loaded.scenarios).toHaveLength(1)
    expect(loaded.scenarios[0].id).toBe('sc-cfg-1')
  })

  it('rejeita ConfigPayload que ultrapasse o limite de 15 MiB', async () => {
    // Cria um payload com ~16 MiB em customSubstances
    const bigCustomSubstances = []
    for (let i = 0; i < 35000; i++) {
      bigCustomSubstances.push({
        id: `sub-${i}`,
        slug: `slug-${i}`,
        name: `Substância Muito Longa Para Teste ${i} ` + 'A'.repeat(400),
        aliases: ['alias1', 'alias2'],
        category: 'peptide' as const,
        tags: ['tag1', 'tag2'],
        createdAt: '2026-08-27T08:00:00.000Z',
        updatedAt: '2026-08-27T08:00:00.000Z',
      })
    }

    const bigPayload: ConfigPayload = {
      ...baseConfig,
      customSubstances: bigCustomSubstances,
    }

    const validation = validateProjectedConfigPayload(bigPayload)
    expect(validation.ok).toBe(false)
    if (!validation.ok) {
      expect(validation.error.code).toBe('CONFIG_STORAGE_LIMIT_EXCEEDED')
      expect(validation.bytes).toBeGreaterThan(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX)
    }

    const mutationRes = await mutateConfigPayload(() => bigPayload)
    expect(mutationRes.ok).toBe(false)
    if (!mutationRes.ok) {
      expect(mutationRes.error.code).toBe('CONFIG_STORAGE_LIMIT_EXCEEDED')
    }
  })

  it('rejeita ConfigPayload com referências órfãs', async () => {
    const invalidPayload: ConfigPayload = {
      ...baseConfig,
      scenarios: [
        {
          id: 'sc-orphan',
          name: 'Orphan Scenario',
          color: 'blue-500',
          source: {
            type: 'custom_profile',
            customProfileId: 'non-existent-profile',
            pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null },
          },

          displayUnit: 'mg',
          selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
          doses: [],
        },
      ],
    }

    const validation = validateProjectedConfigPayload(invalidPayload)
    expect(validation.ok).toBe(false)

    const res = await mutateConfigPayload(() => invalidPayload)
    expect(res.ok).toBe(false)
  })

  it('remove a falsa premissa de eviction quando Config + history permanecem abaixo de 64 MiB', async () => {
    // 1. Inicializa o storage com ConfigPayload pequeno e 3 registros históricos de ~1.5 MB cada
    await saveConfigPayload(baseConfig)

    const rec1 = createDummyCalculationRecord('rec-1', 1_500_000)
    const rec2 = createDummyCalculationRecord('rec-2', 1_500_000)
    const rec3 = createDummyCalculationRecord('rec-3', 1_500_000)

    await addCalculationRecord(rec1)
    await addCalculationRecord(rec2)
    await addCalculationRecord(rec3)

    const initialHistory = await getCalculationRecords()
    expect(initialHistory).toHaveLength(3)

    // 2. Config válido de ~13 MiB + history de ~4,5 MiB continua muito abaixo de 64 MiB.
    const mediumCustomSubstances = [{
      id: 'sub-large', slug: 'sub-large', name: 'Substância válida',
      aliases: ['B'.repeat(13 * 1024 * 1024)], category: 'other' as const, tags: [],
      createdAt: '2026-08-27T08:00:00.000Z', updatedAt: '2026-08-27T08:00:00.000Z',
    }]

    const enlargedConfig: ConfigPayload = {
      ...baseConfig,
      customSubstances: mediumCustomSubstances,
    }

    // 3. Executa SOMENTE mutateConfigPayload
    const res = await mutateConfigPayload(() => enlargedConfig)
    expect(res.ok).toBe(true)

    if (res.ok) {
      expect(res.evictedHistoryCount).toBe(0)
      expect(res.evictedHistoryBytes).toBe(0)
      // 4. Verifica se o FullBackup projetado final respeita 64 MiB
      const historyAfter = await getCalculationRecords()
      const finalConfig = await loadConfigPayload()
      const projectedBytes = calculateProjectedFullBackupBytes(finalConfig, historyAfter)

      expect(projectedBytes).toBeLessThanOrEqual(SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX)
      expect(finalConfig.customSubstances).toHaveLength(1)
    }
  })
})
