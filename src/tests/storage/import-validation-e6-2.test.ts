import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, ConfigPayload, FullBackupBundle, Protocol, Scenario } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import { buildConfigExport, buildFullBackup } from '../../storage/export'
import { getDefaultFavorites, getDefaultSettings, resetStorageForTesting, setCustomIDBFactoryForTesting } from '../../storage/idb'
import { validateAndPreviewConfigImport, validateAndPreviewFullBackupImport } from '../../storage/import'

const baseConfig = (): ConfigPayload => ({
  settings: getDefaultSettings(), favorites: getDefaultFavorites(), customSubstances: [],
  customProfiles: [], recipes: [], scenarios: [], protocols: [],
})

const scenarioLibrary = (datasetVersion: number): Scenario => ({
  id: 'scenario-library', name: 'Library', color: '#2563eb',
  source: { type: 'library', substanceId: 'substance', profileId: 'profile', datasetVersion,
    pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null } },
  displayUnit: 'mg', selectedPkParameters: { halfLifeMs: 43_200_000, tmaxMs: null }, doses: [],
})

const protocolLibrary = (datasetVersion: number): Protocol => ({
  id: 'protocol-library', name: 'Protocol', totalDoseMg: 100,
  schedule: { startDate: '2026-08-27', localTime: '08:00', timeZone: 'UTC', recurrence: { type: 'single' } },
  components: [{ id: 'component', label: 'Component', proportion: 1,
    source: { type: 'library', substanceId: 'substance', profileId: 'profile', datasetVersion },
    selectedPkParameters: { halfLifeMs: 43_200_000, tmaxMs: null },
    pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null },
    displayColor: { paletteColor: '#2563eb' } }],
  createdAt: '2026-08-27T08:00:00.000Z', updatedAt: '2026-08-27T08:00:00.000Z',
})

const record = (id: string, datasetVersion = 1): CalculationRecord => ({
  id, createdAt: '2026-08-27T08:00:00.000Z', display: { title: id, color: '#2563eb' },
  type: 'reconstitution', versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion },
  input: { vialMassMg: 10, diluentVolumeMl: 2, desiredDoseMcg: 100,
    syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 } },
  resultSnapshot: { concentrationMcgPerMl: 5000, doseVolumeMl: 0.02, syringeUnits: 2,
    theoreticalMaxDoses: 100, capacityExceeded: false, warnings: [],
    metadata: { reconstitutionEngineVersion: '1.0.0' } },
})

describe('Import validation corrigida da E6.2', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB); setPersistenceConsent(true); await resetStorageForTesting()
  })

  it('rejeita bundle.datasetVersion futuro em Config e FullBackup', async () => {
    const config = buildConfigExport(baseConfig())
    const full = buildFullBackup(baseConfig(), [])
    expect(config.ok && full.ok).toBe(true)
    if (!config.ok || !full.ok) return
    const configFuture = { ...config.bundle, datasetVersion: 999 }
    const fullFuture = { ...full.bundle, datasetVersion: 999 }
    const configResult = await validateAndPreviewConfigImport({ content: JSON.stringify(configFuture) })
    const fullResult = await validateAndPreviewFullBackupImport({ content: JSON.stringify(fullFuture) })
    expect(configResult.ok).toBe(false); expect(fullResult.ok).toBe(false)
    if (!configResult.ok) expect(configResult.error.internalReason).toBe('FUTURE_DATASET_VERSION')
    if (!fullResult.ok) expect(fullResult.error.internalReason).toBe('FUTURE_DATASET_VERSION')
  })

  it('usa CURRENT_DATASET_VERSION contra favorite official futuro', async () => {
    const payload = baseConfig()
    payload.favorites.substances = [{ type: 'official', substanceId: 'future', datasetVersion: 999 }]
    const bundle = buildConfigExport(baseConfig())
    expect(bundle.ok).toBe(true)
    if (!bundle.ok) return
    const result = await validateAndPreviewConfigImport({ content: JSON.stringify({ ...bundle.bundle, payload }) })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.internalReason).toBe('REFERENCE_VALIDATION_FAILED')
  })

  it('rejeita datasetVersion futuro em Scenario e ProtocolComponent', async () => {
    const baseBundle = buildConfigExport(baseConfig())
    expect(baseBundle.ok).toBe(true)
    if (!baseBundle.ok) return
    for (const payload of [
      { ...baseConfig(), scenarios: [scenarioLibrary(999)] },
      { ...baseConfig(), protocols: [protocolLibrary(999)] },
    ]) {
      const result = await validateAndPreviewConfigImport({ content: JSON.stringify({ ...baseBundle.bundle, payload }) })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.internalReason).toBe('REFERENCE_VALIDATION_FAILED')
    }
  })

  it('rejeita CalculationRecord com datasetVersion futuro', async () => {
    const valid = buildFullBackup(baseConfig(), [record('future-history')])
    expect(valid.ok).toBe(true)
    if (!valid.ok) return
    const bundle = structuredClone(valid.bundle)
    bundle.history[0].versions.datasetVersion = 999
    const result = await validateAndPreviewFullBackupImport({ content: JSON.stringify(bundle) })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.internalReason).toBe('FUTURE_DATASET_VERSION')
  })

  it('rejeita IDs duplicados no history e counts divergentes com motivos internos próprios', async () => {
    const valid = buildFullBackup(baseConfig(), [record('duplicate')])
    expect(valid.ok).toBe(true)
    if (!valid.ok) return
    const duplicate: FullBackupBundle = { ...structuredClone(valid.bundle),
      history: [record('duplicate'), record('duplicate')],
      counts: { ...valid.bundle.counts, records: 2 } }
    const duplicateResult = await validateAndPreviewFullBackupImport({ content: JSON.stringify(duplicate) })
    expect(duplicateResult.ok).toBe(false)
    if (!duplicateResult.ok) expect(duplicateResult.error.internalReason).toBe('DUPLICATE_HISTORY_ID')

    const counts = structuredClone(valid.bundle); counts.counts.records = 2
    const countsResult = await validateAndPreviewFullBackupImport({ content: JSON.stringify(counts) })
    expect(countsResult.ok).toBe(false)
    if (!countsResult.ok) expect(countsResult.error.internalReason).toBe('COUNTS_MISMATCH')
  })

  it('não altera o consentimento em preview válido ou inválido', async () => {
    const valid = buildConfigExport(baseConfig())
    expect(valid.ok).toBe(true)
    if (!valid.ok) return
    setPersistenceConsent(false)
    expect((await validateAndPreviewConfigImport({ content: valid.json })).ok).toBe(true)
    expect((await validateAndPreviewConfigImport({ content: '{invalid' })).ok).toBe(false)
    // A quarentena opera na memória quando consent=false, sem ligar persistência.
    const { getPersistenceConsent } = await import('../../storage/consent')
    expect(getPersistenceConsent()).toBe(false)
  })
})
