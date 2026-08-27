import type { LegacyKeyValueStorage, LegacyMigrationSourceKey } from './types'

export const LEGACY_SOURCE_KEYS: readonly LegacyMigrationSourceKey[] = ['hormoTrackerProtocols', 'meiavida:v2:data']
export const LEGACY_MEIAVIDA_PERSISTENCE_KEY = 'meiavida:v2:persistence-enabled'

export function migrationMarkerKey(sourceKey: LegacyMigrationSourceKey): string {
  return `fk:v1:migrated-from=${sourceKey}`
}

export function defaultLegacyStorage(): LegacyKeyValueStorage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage
  } catch {
    return null
  }
  return null
}

export function readLegacySource(sourceKey: LegacyMigrationSourceKey, storage = defaultLegacyStorage()): string | null {
  try { return storage?.getItem(sourceKey) ?? null } catch { return null }
}
