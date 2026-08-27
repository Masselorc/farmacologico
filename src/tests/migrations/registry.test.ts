import { describe, expect, it } from 'vitest'
import { inspectLegacyMigrationSources, migrationMarkerKey, readLegacySource } from '../../migrations'

class MemoryStorage {
  readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

describe('E7 registry/storage legado', () => {
  it('lê sem reescrever originais e usa marker exato', () => {
    const storage = new MemoryStorage()
    storage.setItem('hormoTrackerProtocols', 'RAW_A')
    storage.setItem('meiavida:v2:data', 'RAW_B')
    storage.setItem('meiavida:v2:persistence-enabled', 'true')
    expect(readLegacySource('hormoTrackerProtocols', storage)).toBe('RAW_A')
    expect(migrationMarkerKey('meiavida:v2:data')).toBe('fk:v1:migrated-from=meiavida:v2:data')
    const inspection = inspectLegacyMigrationSources(storage)
    expect(inspection.sources[0]?.available).toBe(true)
    expect(inspection.legacyMeiavidaPersistenceWasEnabled).toBe(true)
    expect(storage.getItem('hormoTrackerProtocols')).toBe('RAW_A')
    expect(storage.getItem('meiavida:v2:data')).toBe('RAW_B')
    expect(storage.getItem('meiavida:v2:persistence-enabled')).toBe('true')
  })
})
