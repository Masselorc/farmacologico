import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { indexedDB } from 'fake-indexeddb'
import { applyLegacyMigration, migrationMarkerKey, previewHormoTrackerMigration, previewMeiavidaMigration, readLegacySource } from '../../migrations'
import { resetMigrationSessionForTesting } from '../../migrations/testing'
import { setPersistenceConsentForTesting, resetStorageForTesting, setCustomIDBFactoryForTesting } from '../../storage/testing'
import { loadConfigPayload } from '../../storage'
import { mutateConfigPayload } from '../../storage/config'
import { createFaultController } from '../storage/idb-faults'

class MemoryStorage {
  readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const raw = { schemaVersion: 2, scenarios: [{ id: 's', name: 'S', color: '#2563eb', halfLifeValue: 1, halfLifeUnit: 'days', tmaxValue: 0, tmaxUnit: 'minutes', displayUnit: 'mg', doses: [] }] }

describe('E7 apply/idempotência', () => {
  const faults = createFaultController(indexedDB)

  beforeEach(async () => {
    faults.disarm()
    setCustomIDBFactoryForTesting(faults.factory)
    resetMigrationSessionForTesting()
    await resetStorageForTesting()
  })

  it('aplica uma vez, preserva original e marca somente com consentimento', async () => {
    setPersistenceConsentForTesting(true)
    const storage = new MemoryStorage()
    storage.setItem('meiavida:v2:data', JSON.stringify(raw))
    const preview = previewMeiavidaMigration(raw, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    const first = await applyLegacyMigration(preview, { storage })
    const afterFirst = await loadConfigPayload()
    const second = await applyLegacyMigration(preview, { storage })
    expect(first.status).toBe('applied')
    expect(first.markerPersisted).toBe(true)
    expect(second.status).toBe('already_migrated')
    expect((await loadConfigPayload())).toEqual(afterFirst)
    expect(storage.getItem('meiavida:v2:data')).toBe(JSON.stringify(raw))
    expect(storage.getItem(migrationMarkerKey('meiavida:v2:data'))).toBe('true')
  })

  it('mantém marker apenas na sessão quando consentimento está off', async () => {
    setPersistenceConsentForTesting(false)
    const storage = new MemoryStorage()
    const result = await applyLegacyMigration(previewMeiavidaMigration(raw, { assumedTimeZone: 'UTC' }), { storage })
    expect(result.persisted).toBe(false)
    expect(result.markerPersisted).toBe(false)
    expect(storage.getItem(migrationMarkerKey('meiavida:v2:data'))).toBeNull()
  })

  it('faz copy-in síncrono e tolera falha do marker sem sobrescrever dados', async () => {
    setPersistenceConsentForTesting(true)
    const storage = new MemoryStorage()
    const failingStorage = {
      getItem: (key: string) => storage.getItem(key),
      setItem: () => { throw new Error('marker indisponível') },
    }
    const preview = previewMeiavidaMigration(raw, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    const promise = applyLegacyMigration(preview, { storage: failingStorage })
    preview.entities[0]!.name = 'alterado depois da chamada'
    const result = await promise
    expect((await loadConfigPayload()).scenarios[0]?.name).toBe('S')
    expect(Object.keys(result.report).sort()).toEqual([
      'assumedTimeZone', 'colorRemaps', 'discardedCount', 'importedCount', 'quarantined', 'ranAt', 'sourceKey',
    ])
    expect(result.markerPersisted).toBe(false)

    resetMigrationSessionForTesting()
    const retryPreview = previewMeiavidaMigration(raw, { assumedTimeZone: 'UTC', ranAt: '2026-08-28T12:00:00Z' })
    const retry = await applyLegacyMigration(retryPreview, { storage: failingStorage })
    expect(retry.status).toBe('already_migrated')
    expect(retry.markerPersisted).toBe(false)
    expect((await loadConfigPayload()).scenarios).toHaveLength(1)
  })

  it('relata remaps somente dos Protocols aceitos pelo cap do Config', async () => {
    setPersistenceConsentForTesting(false)
    const preview = previewHormoTrackerMigration([
      { id: 'first', name: 'Primeiro', halfLife: 1, tmax: 0, dose: 1, startDate: '2026-08-27', type: 'single', color: '#000001' },
      { id: 'second', name: 'Segundo', halfLife: 1, tmax: 0, dose: 1, startDate: '2026-08-27', type: 'single', color: '#000002' },
    ], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    const template = preview.entities[0]!
    const seeded = await mutateConfigPayload((current) => ({
      ...current,
      protocols: Array.from({ length: 199 }, (_, index) => ({ ...template, id: `existing-${index}` })),
    }))
    expect(seeded.ok).toBe(true)

    const result = await applyLegacyMigration(preview, { storage: new MemoryStorage() })
    expect(result.status).toBe('applied')
    expect(result.addedCount).toBe(1)
    expect(result.report.colorRemaps).toEqual([
      expect.objectContaining({ protocolId: preview.entities[0]!.id }),
    ])
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'LEGACY_CONFIG_CAPACITY_EXCEEDED' }))
  })

  it('não relata remap quando o Config já está na capacidade máxima', async () => {
    setPersistenceConsentForTesting(false)
    const preview = previewHormoTrackerMigration([
      { id: 'capacity', name: 'Capacidade', halfLife: 1, tmax: 0, dose: 1, startDate: '2026-08-27', type: 'single', color: '#000001' },
    ], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    const template = preview.entities[0]!
    const seeded = await mutateConfigPayload((current) => ({
      ...current,
      protocols: Array.from({ length: 200 }, (_, index) => ({ ...template, id: `full-${index}` })),
    }))
    expect(seeded.ok).toBe(true)
    const result = await applyLegacyMigration(preview, { storage: new MemoryStorage() })
    expect(result.status).toBe('nothing_to_apply')
    expect(result.report.colorRemaps).toEqual([])
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'LEGACY_CONFIG_CAPACITY_EXCEEDED' }))
  })

  it('não sobrescreve ID conflitante nem relata seu remap como aplicado', async () => {
    setPersistenceConsentForTesting(false)
    const preview = previewHormoTrackerMigration([
      { id: 'conflict', name: 'Original', halfLife: 1, tmax: 0, dose: 1, startDate: '2026-08-27', type: 'single', color: '#000001' },
    ], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    const conflicting = { ...preview.entities[0]!, name: 'Conteúdo FARMakit diferente' }
    const seeded = await mutateConfigPayload((current) => ({ ...current, protocols: [conflicting] }))
    expect(seeded.ok).toBe(true)
    const storage = new MemoryStorage()
    const result = await applyLegacyMigration(preview, { storage })
    expect(result.status).toBe('nothing_to_apply')
    expect(result.report.colorRemaps).toEqual([])
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'LEGACY_ID_CONFLICT', requiresQuarantine: true }))
    expect((await loadConfigPayload()).protocols).toEqual([conflicting])
    expect(storage.getItem(migrationMarkerKey('hormoTrackerProtocols'))).toBeNull()
  })

  it('aplica o array LANDERGOLD, preserva a source byte a byte e não duplica sem marker', async () => {
    setPersistenceConsentForTesting(false)
    const raw = readFileSync(join(process.cwd(), 'src/migrations/fixtures/hormotracker-legacy-landergold.json'), 'utf8')
    const storage = new MemoryStorage()
    storage.setItem('hormoTrackerProtocols', raw)
    const before = storage.getItem('hormoTrackerProtocols')
    const source = readLegacySource('hormoTrackerProtocols', storage)
    const preview = previewHormoTrackerMigration(source, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    expect(preview.entities).toHaveLength(1)
    const first = await applyLegacyMigration(preview, { storage })
    expect(first.status).toBe('applied')
    expect((await loadConfigPayload()).protocols[0]?.components).toHaveLength(3)
    expect(storage.getItem('hormoTrackerProtocols')).toBe(before)

    resetMigrationSessionForTesting()
    const second = await applyLegacyMigration(
      previewHormoTrackerMigration(source, { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' }),
      { storage },
    )
    expect(second.status).toBe('already_migrated')
    expect((await loadConfigPayload()).protocols).toHaveLength(1)
    expect(storage.getItem('hormoTrackerProtocols')).toBe(before)
  })

  it('não repete remaps quando o marker já encerrou a fonte', async () => {
    setPersistenceConsentForTesting(true)
    const preview = previewHormoTrackerMigration([
      { id: 'mapped', name: 'Mapeado', halfLife: 1, tmax: 0, dose: 1, startDate: '2026-08-27', type: 'single', color: '#000001' },
    ], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    const storage = new MemoryStorage()
    storage.setItem(migrationMarkerKey('hormoTrackerProtocols'), 'true')
    const result = await applyLegacyMigration(preview, { storage })
    expect(result.status).toBe('already_migrated')
    expect(result.report.importedCount).toBe(0)
    expect(result.report.colorRemaps).toEqual([])
  })

  it('retorna falha controlada sem remaps quando a mutação Config aborta', async () => {
    setPersistenceConsentForTesting(true)
    const preview = previewHormoTrackerMigration([
      { id: 'mutation-failure', name: 'Falha atômica', halfLife: 1, tmax: 0, dose: 1, startDate: '2026-08-27', type: 'single', color: '#000001' },
    ], { assumedTimeZone: 'UTC', ranAt: '2026-08-27T12:00:00Z' })
    faults.arm({ kind: 'transaction-abort', operation: 'clear', store: 'protocols' })

    const result = await applyLegacyMigration(preview, { storage: new MemoryStorage() })

    expect(result.status).toBe('failed')
    expect(result.report.importedCount).toBe(0)
    expect(result.report.colorRemaps).toEqual([])
    expect(result.addedCount).toBe(0)
    expect(result.persisted).toBe(false)
    expect(result.markerPersisted).toBe(false)
    expect((await loadConfigPayload()).protocols).toEqual([])
  })
})
