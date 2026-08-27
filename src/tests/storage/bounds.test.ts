import { describe, expect, it } from 'vitest'
import { SAFETY_LIMITS } from '../../validation/limits'
import {
  chartViewScenarioSnapshotSchema,
  configExportBundleSchema,
  protocolAnalysisSeriesSnapshotSchema,
} from '../../validation/schemas/data-management'

describe('Safety Limits & Exact Bounds (§6, §11, §12, E6.1)', () => {
  it('cap de 1200 pontos por série: 1200 é aceito e 1201 é rejeitado', () => {
    // 1. ChartViewScenarioSnapshot.points
    const validPoints = Array.from({ length: 1200 }, (_, i) => ({
      timeMs: i * 1000,
      value: 100,
      valueKind: 'mg' as const,
    }))

    const validScenarioSnap = {
      scenarioId: 'sc-1',
      label: 'S1',
      color: 'blue-500' as const,
      points: validPoints,
    }
    expect(chartViewScenarioSnapshotSchema.safeParse(validScenarioSnap).success).toBe(true)

    const invalidPoints = [
      ...validPoints,
      { timeMs: 1200000, value: 100, valueKind: 'mg' as const },
    ]
    const invalidScenarioSnap = {
      ...validScenarioSnap,
      points: invalidPoints,
    }
    expect(chartViewScenarioSnapshotSchema.safeParse(invalidScenarioSnap).success).toBe(false)

    // 2. ProtocolAnalysisSeriesSnapshot.displayPoints
    const validDisplayPoints = Array.from({ length: 1200 }, (_, i) => ({
      timeMs: i * 1000,
      amountMg: 50,
    }))
    const validSeriesSnap = {
      key: { protocolId: 'p1', componentId: 'c1' },
      label: 'Series 1',
      color: 'blue-500' as const,
      displayPoints: validDisplayPoints,
      state: {
        administeredMg: 50,
        centralMg: 50,
        depotMg: 0,
        eliminatedMg: 0,
        administeredCount: 1,
        plannedCount: 1,
        centralPercent: 100,
        depotPercent: 0,
        eliminatedPercent: 0,
      },
      peak: { timeMs: 0, amountMg: 50 },
      milestones: [],
      warnings: [],
    }
    expect(protocolAnalysisSeriesSnapshotSchema.safeParse(validSeriesSnap).success).toBe(true)

    const invalidSeriesSnap = {
      ...validSeriesSnap,
      displayPoints: [...validDisplayPoints, { timeMs: 1200000, amountMg: 50 }],
    }
    expect(protocolAnalysisSeriesSnapshotSchema.safeParse(invalidSeriesSnap).success).toBe(false)
  })

  it('teto de 20 cenários por ConfigPayload', () => {
    const scenarios20 = Array.from({ length: 20 }, (_, i) => ({
      id: `sc-${i}`,
      name: `Cenário ${i}`,
      color: 'blue-500' as const,
      source: {
        type: 'manual' as const,
        pkParametersSnapshot: { halfLife: { value: 10, unit: 'hours' as const }, tmax: null },
      },
      displayUnit: 'mg' as const,
      selectedPkParameters: { halfLifeMs: 36000000, tmaxMs: null },
      doses: [],
    }))

    const bundle20 = {
      bundleKind: 'config' as const,
      schemaVersion: 1 as const,
      exportedAt: '2026-08-27T08:00:00.000Z',
      datasetVersion: 1,
      engineVersions: { pk: '1.0.0', recurrence: '1.0.0', reconstitution: '1.0.0' },
      payload: {
        settings: { theme: 'system' as const, calendarTimeZone: 'UTC' },
        favorites: { substances: [], recipeIds: [] },
        customSubstances: [],
        customProfiles: [],
        recipes: [],
        scenarios: scenarios20,
        protocols: [],
      },
    }
    expect(configExportBundleSchema.safeParse(bundle20).success).toBe(true)

    // 21 cenários
    const bundle21 = {
      ...bundle20,
      payload: {
        ...bundle20.payload,
        scenarios: [
          ...scenarios20,
          {
            id: 'sc-21',
            name: 'Cenário 21',
            color: 'blue-500' as const,
            source: {
              type: 'manual' as const,
              pkParametersSnapshot: { halfLife: { value: 10, unit: 'hours' as const }, tmax: null },
            },
            displayUnit: 'mg' as const,
            selectedPkParameters: { halfLifeMs: 36000000, tmaxMs: null },
            doses: [],
          },
        ],
      },
    }
    expect(configExportBundleSchema.safeParse(bundle21).success).toBe(false)
  })

  it('valores numéricos exatos de limites de bytes UTF-8 congelados', () => {
    expect(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX).toBe(15 * 1024 * 1024)
    expect(SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX).toBe(16 * 1024 * 1024)
    expect(SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX).toBe(8 * 1024 * 1024)
    expect(SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX).toBe(47 * 1024 * 1024)
    expect(SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX).toBe(64 * 1024 * 1024)
    expect(SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX).toBe(256 * 1024)
    expect(SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX).toBe(1 * 1024 * 1024)
    expect(SAFETY_LIMITS.HISTORY_RECORDS_MAX).toBe(500)
    expect(SAFETY_LIMITS.QUARANTINE_ITEMS_MAX).toBe(5)
    expect(SAFETY_LIMITS.DISPLAY_POINTS_PER_SERIES_MAX).toBe(1200)
  })
})
