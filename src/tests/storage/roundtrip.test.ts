import { beforeEach, describe, expect, it } from 'vitest'
import type {
  CalculationRecord,
  ConfigPayload,
} from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import {
  exportCurrentConfig,
  exportCurrentFullBackup,
} from '../../storage/export'


import {
  applyImport,
  validateAndPreviewConfigImport,
  validateAndPreviewFullBackupImport,
} from '../../storage/import'
import { resetStorageForTesting, saveConfigPayload } from '../../storage/idb'
import { addCalculationRecord } from '../../storage/history'

const fullConfig: ConfigPayload = {
  settings: {
    theme: 'dark',
    calendarTimeZone: 'America/Sao_Paulo',
    graduationWarnThreshold: 0.05,
  },
  favorites: {
    substances: [
      { type: 'official', substanceId: 'sub-1', datasetVersion: 1 },
      { type: 'custom', substanceId: 'cust-sub-1' },
    ],
    recipeIds: ['recip-1'],
  },
  customSubstances: [
    {
      id: 'cust-sub-1',
      slug: 'cust-sub',
      name: 'Custom Substance',
      aliases: ['CS'],
      category: 'peptide',
      tags: ['lab'],
      createdAt: '2026-08-27T10:00:00Z',
      updatedAt: '2026-08-27T10:00:00Z',
    },
  ],
  customProfiles: [
    {
      id: 'cust-prof-1',
      owner: { type: 'custom', substanceId: 'cust-sub-1' },
      route: 'subcutaneous',
      halfLife: { value: 48, unit: 'hours' },
      tmaxSpec: { kind: 'value', value: { value: 4, unit: 'hours' } },
      origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      createdAt: '2026-08-27T10:00:00Z',
      updatedAt: '2026-08-27T10:00:00Z',
    },
  ],
  recipes: [
    {
      id: 'recip-1',
      name: 'Receita 1',
      input: {
        vialMassMg: 5,
        diluentVolumeMl: 1,
        desiredDoseMcg: 250,
        syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 },
      },
      createdAt: '2026-08-27T10:00:00Z',
      updatedAt: '2026-08-27T10:00:00Z',
    },
  ],
  scenarios: [
    {
      id: 'sc-round-1',
      name: 'Cenário Roundtrip',
      color: 'blue-500',
      source: {
        type: 'library',
        substanceId: 'sub-1',
        profileId: 'prof-1',
        datasetVersion: 1,
        pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
      },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
      doses: [{ id: 'd1', amountMg: 100, time: '2026-08-27T08:00:00.000Z' }],
    },
  ],


  protocols: [
    {
      id: 'proto-round-1',
      name: 'Protocolo Roundtrip',
      totalDoseMg: 200,
      schedule: {
        startDate: '2026-08-27',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'single' },
      },
      components: [
        {
          id: 'comp-1',
          label: 'Comp 1',
          proportion: 1,
          source: { type: 'manual' },
          selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
          pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
          displayColor: { paletteColor: 'purple' },
        },
      ],
      createdAt: '2026-08-27T10:00:00Z',
      updatedAt: '2026-08-27T10:00:00Z',
    },
  ],
}

const pkHistoryRecord: CalculationRecord = {
  id: 'pk-rec-rt',
  createdAt: '2026-08-27T11:00:00Z',
  display: { title: 'Simulação PK', color: 'blue-500', note: 'Nota' },
  type: 'pharmacokinetics',
  versions: { pkEngineVersion: '1.0.0', recurrenceEngineVersion: '1.0.0', datasetVersion: 1 },
  scenarios: [
    {
      scenarioId: 'sc-round-1',
      scenarioSnapshot: fullConfig.scenarios[0],
      simulationInput: {
        halfLifeMs: 86400000,
        tmaxMs: null,
        doses: [{ id: 'd1', amountMg: 100, timeMs: 0 }],
        nowMs: 0,
      },
      resultSnapshot: {
        currentState: {
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
        analysisCurve: [{ timeMs: 0, amountMg: 100 }],
        peak: { timeMs: 0, amountMg: 100 },
        milestones: [{ percentage: 50, targetMg: 50, timeMs: 86400000 }],
        warnings: [],
        metadata: {
          pkEngineVersion: '1.0.0',
          kePerMs: 0.00001,
          kaPerMs: null,
          terminalHalfLifeMs: 86400000,
          horizonEndMs: 864000000,
          analysisCurveSteps: 1600,
          contributionCutoffHalfLives: 44,
          contributionCutoffAgeMs: 86400000 * 44,
        },
      },
    },
  ],
  chartViewSnapshot: {
    displayWindow: { startMs: 0, endMs: 86400000 },
    calendarTimeZone: 'America/Sao_Paulo',
    scaleMode: 'absolute',
    yAxisMode: 'linear',
    displayPointsByScenario: [
      {
        scenarioId: 'sc-round-1',
        label: 'Cenário Roundtrip',
        color: 'blue-500',
        points: [{ timeMs: 0, value: 100, valueKind: 'mg', clippedBelowLogEpsilon: false }],
      },
    ],
  },
}

describe('Same-Version Round-Trip Invariants (§11, §17)', () => {
  beforeEach(async () => {
    setPersistenceConsent(true)
    await resetStorageForTesting()
  })

  it('Config Export -> Import -> Apply -> Export preserva 100% do estado estrutural', async () => {
    await saveConfigPayload(fullConfig)

    // 1. Exporta
    const exportRes1 = await exportCurrentConfig('2026-08-27T12:00:00Z')
    expect(exportRes1.ok).toBe(true)
    if (!exportRes1.ok) return

    // 2. Limpa o storage
    await resetStorageForTesting()

    // 3. Valida e importa
    const importRes = await validateAndPreviewConfigImport({ content: exportRes1.json })
    expect(importRes.ok).toBe(true)
    if (!importRes.ok) return

    await applyImport(importRes.preview)

    // 4. Exporta novamente
    const exportRes2 = await exportCurrentConfig('2026-08-27T12:00:00Z')
    expect(exportRes2.ok).toBe(true)
    if (!exportRes2.ok) return

    // Compara bundles JSON
    expect(JSON.parse(exportRes2.json)).toEqual(JSON.parse(exportRes1.json))
  })

  it('FullBackup Export -> Import -> Apply -> Export preserva histórico, snapshots e timezone', async () => {
    await saveConfigPayload(fullConfig)
    await addCalculationRecord(pkHistoryRecord)

    // 1. Exporta FullBackup
    const exportRes1 = await exportCurrentFullBackup('2026-08-27T12:00:00Z')
    expect(exportRes1.ok).toBe(true)
    if (!exportRes1.ok) return

    // 2. Limpa storage
    await resetStorageForTesting()

    // 3. Importa
    const importRes = await validateAndPreviewFullBackupImport({ content: exportRes1.json })
    expect(importRes.ok).toBe(true)
    if (!importRes.ok) return

    await applyImport(importRes.preview)

    // 4. Exporta novamente
    const exportRes2 = await exportCurrentFullBackup('2026-08-27T12:00:00Z')
    expect(exportRes2.ok).toBe(true)
    if (!exportRes2.ok) return

    expect(JSON.parse(exportRes2.json)).toEqual(JSON.parse(exportRes1.json))
  })
})
