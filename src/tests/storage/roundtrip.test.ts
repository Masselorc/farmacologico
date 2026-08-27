import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, ConfigPayload, Scenario } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import { exportCurrentConfig, exportCurrentFullBackup } from '../../storage/export'
import { addCalculationRecord } from '../../storage/history'
import {
  getDefaultFavorites,
  loadConfigPayload,
  resetStorageForTesting,
  saveConfigPayload,
  setCustomIDBFactoryForTesting,
} from '../../storage/idb'

import {
  applyImport,
  validateAndPreviewConfigImport,
  validateAndPreviewFullBackupImport,
} from '../../storage/import'

const dummyScenario: Scenario = {
  id: 'sc-rt-1',
  name: 'Cenário Round-Trip',
  color: 'emerald-500',
  source: {
    type: 'manual',
    pkParametersSnapshot: { halfLife: { value: 18, unit: 'hours' }, tmax: null },
  },
  displayUnit: 'mg',
  selectedPkParameters: { halfLifeMs: 64800000, tmaxMs: null },
  doses: [{ id: 'd1', amountMg: 250, time: '2026-08-27T08:00:00.000Z' }],
}

const reconRecord: CalculationRecord = {
  id: 'rec-rt-recon',
  createdAt: '2026-08-27T08:00:00.000Z',
  display: { title: 'Reconstituição RT', color: 'blue-500' },
  type: 'reconstitution',
  versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
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

const protoRecord: CalculationRecord = {
  id: 'rec-rt-proto',
  createdAt: '2026-08-27T08:30:00.000Z',
  display: { title: 'Protocol Analysis RT', color: 'purple-500' },
  type: 'protocol-analysis',
  versions: {
    pkEngineVersion: '1.0.0',
    recurrenceEngineVersion: '1.0.0',
    datasetVersion: 1,
  },
  timeZone: 'America/Sao_Paulo',
  protocolsSnapshot: [
    {
      id: 'proto:rt:1',
      name: 'Protocolo RT',
      totalDoseMg: 100,
      schedule: {
        startDate: '2026-08-27',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'single' },
      },

      components: [
        {
          id: 'comp:rt:1',
          label: 'Componente RT',
          proportion: 1,
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
          pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
          displayColor: { paletteColor: 'purple-500' },
        },
      ],

      createdAt: '2026-08-27T08:00:00.000Z',
      updatedAt: '2026-08-27T08:00:00.000Z',
    },
  ],

  snapshot: {
    displayWindow: { startMs: 0, endMs: 86400000 },
    calculationWindow: { startMs: 0, endMs: 86400000 },
    series: [
      {
        key: { protocolId: 'proto:rt:1', componentId: 'comp:rt:1' },
        label: 'Série RT',
        color: 'purple-500',
        displayPoints: [{ timeMs: 0, amountMg: 100, clippedBelowLogEpsilon: false }],
        state: {
          administeredMg: 100,
          centralMg: 100,
          depotMg: 0,
          eliminatedMg: 0,
          administeredCount: 1,
          plannedCount: 1,
          centralPercent: 100,
          depotPercent: 0,
          eliminatedPercent: 0,
        },
        peak: { timeMs: 0, amountMg: 100 },
        milestones: [{ percentage: 50, targetMg: 50, timeMs: 86400000 }],
        warnings: [],
      },
    ],
  },
  simulationInputs: [
    {
      key: { protocolId: 'proto:rt:1', componentId: 'comp:rt:1' },
      input: {
        halfLifeMs: 86400000,
        tmaxMs: null,
        doses: [{ id: 'd1', amountMg: 100, timeMs: 0 }],
        nowMs: 0,
      },
    },
  ],
}

describe('Same-Version Round-Trip Integrity (§11, E6.1)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('preserva igualdade estrutural no round-trip de ConfigExport', async () => {
    const originalConfig: ConfigPayload = {
      settings: { theme: 'dark', calendarTimeZone: 'America/Sao_Paulo' },
      favorites: getDefaultFavorites(),
      customSubstances: [],
      customProfiles: [],
      recipes: [],
      scenarios: [dummyScenario],
      protocols: [],
    }

    await saveConfigPayload(originalConfig)

    // 1. Exporta
    const exportRes = await exportCurrentConfig('2026-08-27T08:00:00.000Z')
    expect(exportRes.ok).toBe(true)
    if (!exportRes.ok) return

    // 2. Limpa o storage
    await resetStorageForTesting()
    expect((await loadConfigPayload()).scenarios).toHaveLength(0)

    // 3. Valida e obtém preview da importação
    const previewRes = await validateAndPreviewConfigImport({
      name: 'config.json',
      content: exportRes.json,
    })
    expect(previewRes.ok).toBe(true)
    if (!previewRes.ok) return

    // 4. Aplica
    await applyImport(previewRes.preview)

    // 5. Reexporta e compara
    const reExportRes = await exportCurrentConfig('2026-08-27T08:00:00.000Z')
    expect(reExportRes.ok).toBe(true)
    if (!reExportRes.ok) return

    expect(reExportRes.bundle).toEqual(exportRes.bundle)
  })

  it('CORREÇÃO 16: preserva igualdade estrutural no round-trip de FullBackup incluindo protocol-analysis e reconstitution', async () => {
    const originalConfig: ConfigPayload = {
      settings: { theme: 'light', calendarTimeZone: 'America/Sao_Paulo' },
      favorites: getDefaultFavorites(),
      customSubstances: [],
      customProfiles: [],
      recipes: [],
      scenarios: [dummyScenario],
      protocols: [],
    }

    await saveConfigPayload(originalConfig)
    await addCalculationRecord(reconRecord)
    await addCalculationRecord(protoRecord)

    // 1. Exporta
    const exportRes = await exportCurrentFullBackup('2026-08-27T08:00:00.000Z')
    expect(exportRes.ok).toBe(true)
    if (!exportRes.ok) return

    // 2. Limpa o storage
    await resetStorageForTesting()

    // 3. Valida e obtém preview
    const previewRes = await validateAndPreviewFullBackupImport({
      name: 'backup.json',
      content: exportRes.json,
    })
    expect(previewRes.ok).toBe(true)
    if (!previewRes.ok) return

    // 4. Aplica
    await applyImport(previewRes.preview)

    // 5. Reexporta e compara
    const reExportRes = await exportCurrentFullBackup('2026-08-27T08:00:00.000Z')
    expect(reExportRes.ok).toBe(true)
    if (!reExportRes.ok) return

    expect(reExportRes.bundle).toEqual(exportRes.bundle)
  })
})
