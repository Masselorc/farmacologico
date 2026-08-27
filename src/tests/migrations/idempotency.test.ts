import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import { applyLegacyMigration, migrationMarkerKey, previewMeiavidaMigration } from '../../migrations'
import { resetMigrationSessionForTesting } from '../../migrations/testing'
import { setPersistenceConsentForTesting, resetStorageForTesting, setCustomIDBFactoryForTesting } from '../../storage/testing'
import { loadConfigPayload } from '../../storage'

class MemoryStorage {
  readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const raw = { schemaVersion: 2, scenarios: [{ id: 's', name: 'S', color: '#2563eb', halfLifeValue: 1, halfLifeUnit: 'days', tmaxValue: 0, tmaxUnit: 'minutes', displayUnit: 'mg', doses: [] }] }

describe('E7 apply/idempotência', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
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
})
