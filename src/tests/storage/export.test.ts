import { beforeEach, describe, expect, it } from 'vitest'
import type { CalculationRecord, ConfigPayload } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import {
  buildConfigExport,
  buildFullBackup,
  exportCurrentConfig,
  exportCurrentFullBackup,
} from '../../storage/export'
import { addCalculationRecord } from '../../storage/history'
import { resetStorageForTesting, saveConfigPayload } from '../../storage/idb'
import { CURRENT_DATASET_VERSION, ENGINE_VERSIONS } from '../../domain/version'
import { SAFETY_LIMITS } from '../../validation/limits'

const baseConfig: ConfigPayload = {
  settings: { theme: 'dark', calendarTimeZone: 'America/Sao_Paulo' },
  favorites: { substances: [{ type: 'official', substanceId: 'test-1', datasetVersion: 1 }], recipeIds: [] },
  customSubstances: [],
  customProfiles: [],
  recipes: [],
  scenarios: [
    {
      id: 'sc-1',
      name: 'Cenário Export',
      color: 'blue-500',
      source: { type: 'manual' },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
      doses: [{ id: 'd1', amountMg: 100, time: '2026-08-27T08:00:00.000Z' }],
    },
  ],
  protocols: [],
}


const dummyRecord: CalculationRecord = {
  id: 'rec-exp-1',
  createdAt: '2026-08-27T12:00:00Z',
  display: { title: 'Cálculo Export', color: 'blue-500' },
  type: 'reconstitution',
  versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
  input: {
    vialMassMg: 10,
    diluentVolumeMl: 2,
    desiredDoseMcg: 500,
    syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 },
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

describe('Export Bundles Builder (§6, §11, §15)', () => {
  beforeEach(async () => {
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('buildConfigExport constrói bundle válido com metadados normativos e sem histórico', () => {
    const res = buildConfigExport(baseConfig)

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.bundle.bundleKind).toBe('config')
      expect(res.bundle.schemaVersion).toBe(1)
      expect(res.bundle.datasetVersion).toBe(CURRENT_DATASET_VERSION)
      expect(res.bundle.engineVersions).toEqual(ENGINE_VERSIONS)
      expect(res.bundle.payload.scenarios).toHaveLength(1)
      expect((res.bundle as { history?: unknown }).history).toBeUndefined()
    }
  })

  it('buildFullBackup constrói bundle válido com payload, histórico e counts', () => {
    const res = buildFullBackup(baseConfig, [dummyRecord])

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.bundle.bundleKind).toBe('full-backup')
      expect(res.bundle.schemaVersion).toBe(1)
      expect(res.bundle.datasetVersion).toBe(CURRENT_DATASET_VERSION)
      expect(res.bundle.engineVersions).toEqual(ENGINE_VERSIONS)
      expect(res.bundle.history).toHaveLength(1)
      expect(res.bundle.counts).toEqual({
        records: 1,
        recipes: 0,
        scenarios: 1,
        protocols: 0,
      })
    }
  })

  it('exportCurrentConfig e exportCurrentFullBackup exportam o estado real persistido', async () => {
    await saveConfigPayload(baseConfig)
    await addCalculationRecord(dummyRecord)

    const cfgRes = await exportCurrentConfig()
    expect(cfgRes.ok).toBe(true)
    if (cfgRes.ok) {
      expect(cfgRes.bundle.payload.scenarios[0].name).toBe('Cenário Export')
    }

    const fullRes = await exportCurrentFullBackup()
    expect(fullRes.ok).toBe(true)
    if (fullRes.ok) {
      expect(fullRes.bundle.history).toHaveLength(1)
      expect(fullRes.bundle.history[0].id).toBe('rec-exp-1')
    }
  })

  it('defesa de limite: retorna EXPORT_SIZE_LIMIT_EXCEEDED se bundle ultrapassar o cap da ação', () => {
    const largeStr = new Array(SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX + 100).fill('a').join('')
    const hugeConfig: ConfigPayload = {
      ...baseConfig,
      scenarios: [
        {
          ...baseConfig.scenarios[0],
          name: largeStr,
        },
      ],
    }

    const res = buildConfigExport(hugeConfig)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('EXPORT_SIZE_LIMIT_EXCEEDED')
    }
  })
})
