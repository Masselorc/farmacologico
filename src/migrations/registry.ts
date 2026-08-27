import type { MigrationReport, Protocol, Scenario } from '../domain/types'
import { clonePersistedValue } from '../storage/clone'
import { addQuarantineItem, getPersistenceConsent, mutateConfigPayload } from '../storage'
import { SAFETY_LIMITS } from '../validation/limits'
import { makeLegacyStableId } from './ids'
import { sortIssues } from './common'
import { defaultLegacyStorage, LEGACY_MEIAVIDA_PERSISTENCE_KEY, LEGACY_SOURCE_KEYS, migrationMarkerKey, readLegacySource } from './legacyStorage'
import type {
  LegacyKeyValueStorage,
  LegacyMigrationApplyResult,
  LegacyMigrationAvailability,
  LegacyMigrationPreview,
  LegacyMigrationSourceKey,
} from './types'

const completedMigrationSourcesInSession = new Set<LegacyMigrationSourceKey>()

export function resetMigrationSessionForTesting(): void {
  completedMigrationSourcesInSession.clear()
}

function durableCompleted(sourceKey: LegacyMigrationSourceKey, storage: LegacyKeyValueStorage | null): boolean {
  try { return storage?.getItem(migrationMarkerKey(sourceKey)) === 'true' } catch { return false }
}

export function isLegacyMigrationCompleted(sourceKey: LegacyMigrationSourceKey, storage = defaultLegacyStorage()): boolean {
  return completedMigrationSourcesInSession.has(sourceKey) || durableCompleted(sourceKey, storage)
}

export function inspectLegacyMigrationSources(storage = defaultLegacyStorage()): {
  sources: LegacyMigrationAvailability[]
  legacyMeiavidaPersistenceWasEnabled: boolean
} {
  const sources = LEGACY_SOURCE_KEYS.map((sourceKey) => ({
    sourceKey,
    available: readLegacySource(sourceKey, storage) !== null,
    completed: isLegacyMigrationCompleted(sourceKey, storage),
  }))
  let legacyMeiavidaPersistenceWasEnabled = false
  try { legacyMeiavidaPersistenceWasEnabled = storage?.getItem(LEGACY_MEIAVIDA_PERSISTENCE_KEY) === 'true' } catch { /* inspection is best effort */ }
  return { sources, legacyMeiavidaPersistenceWasEnabled }
}

function sameEntity(left: Protocol | Scenario, right: Protocol | Scenario): boolean {
  if ('createdAt' in left && 'createdAt' in right) {
    const stable = (value: Protocol): string => JSON.stringify(value, (key, nested) =>
      key === 'createdAt' || key === 'updatedAt' ? undefined : nested,
    )
    return stable(left) === stable(right)
  }
  return JSON.stringify(left) === JSON.stringify(right)
}

function reportFrom<T extends Protocol | Scenario>(
  preview: LegacyMigrationPreview<T>,
  importedCount: number,
  discardedCount: number,
  quarantined: boolean,
  importedEntityIds?: ReadonlySet<string>,
): MigrationReport {
  return {
    sourceKey: preview.sourceKey, ranAt: preview.ranAt, importedCount, discardedCount,
    assumedTimeZone: preview.assumedTimeZone,
    colorRemaps: importedEntityIds
      ? preview.colorRemaps.filter((entry) => importedEntityIds.has(entry.protocolId))
      : preview.colorRemaps,
    quarantined,
  }
}

export function applyLegacyMigration<T extends Protocol | Scenario>(
  suppliedPreview: LegacyMigrationPreview<T>,
  options: { storage?: LegacyKeyValueStorage | null } = {},
): Promise<LegacyMigrationApplyResult> {
  const preview = clonePersistedValue(suppliedPreview)
  return applySnapshot(preview, options.storage === undefined ? defaultLegacyStorage() : options.storage)
}

async function applySnapshot<T extends Protocol | Scenario>(preview: LegacyMigrationPreview<T>, storage: LegacyKeyValueStorage | null): Promise<LegacyMigrationApplyResult> {
  if (isLegacyMigrationCompleted(preview.sourceKey, storage)) {
    return { status: 'already_migrated', report: reportFrom(preview, 0, preview.discardedCount, false), issues: preview.issues, addedCount: 0, persisted: getPersistenceConsent(), markerPersisted: durableCompleted(preview.sourceKey, storage) }
  }
  const issues = [...preview.issues]
  let addedCount = 0
  let alreadyPresentCount = 0
  const addedEntityIds = new Set<string>()
  const mutation = await mutateConfigPayload((current) => {
    const target = preview.sourceKey === 'hormoTrackerProtocols' ? current.protocols : current.scenarios
    const limit = preview.sourceKey === 'hormoTrackerProtocols' ? SAFETY_LIMITS.PROTOCOLS_MAX : SAFETY_LIMITS.SCENARIOS_MAX
    const additions: T[] = []
    for (const entity of preview.entities) {
      const existing = target.find((candidate) => candidate.id === entity.id)
      if (existing) {
        if (sameEntity(existing, entity)) alreadyPresentCount += 1
        else issues.push({ code: 'LEGACY_ID_CONFLICT', discardedUnits: 1, requiresQuarantine: true, groupKey: entity.id })
        continue
      }
      if (target.length + additions.length >= limit) {
        issues.push({ code: 'LEGACY_CONFIG_CAPACITY_EXCEEDED', discardedUnits: 1, requiresQuarantine: false, groupKey: entity.id })
        continue
      }
      additions.push(entity)
    }
    addedCount = additions.length
    for (const addition of additions) addedEntityIds.add(addition.id)
    return preview.sourceKey === 'hormoTrackerProtocols'
      ? { ...current, protocols: [...current.protocols, ...(additions as Protocol[])] }
      : { ...current, scenarios: [...current.scenarios, ...(additions as Scenario[])] }
  })
  const sortedIssues = sortIssues(issues)
  const discardedCount = sortedIssues.reduce((sum, current) => sum + current.discardedUnits, 0)
  if (!mutation.ok) {
    return { status: 'failed', report: reportFrom(preview, 0, discardedCount, false), issues: sortedIssues, addedCount: 0, persisted: false, markerPersisted: false, error: mutation.error.internalReason }
  }
  let quarantined = false
  try {
    const quarantineIssues = sortedIssues.filter((current) => current.requiresQuarantine)
    for (let index = 0; index < quarantineIssues.length; index += 1) {
      const current = quarantineIssues[index]!
      await addQuarantineItem({
        id: makeLegacyStableId('migration:quarantine', preview.sourceKey, current.code, current.groupKey ?? '', current.sourceIndex ?? index),
        source: 'legacy_migration', errorCode: current.code, originalUtf8Bytes: preview.originalUtf8Bytes, createdAt: preview.ranAt,
      })
      quarantined = true
    }
  } catch (error) {
    return { status: 'failed', report: reportFrom(preview, addedCount, discardedCount, quarantined, addedEntityIds), issues: sortedIssues, addedCount, persisted: getPersistenceConsent(), markerPersisted: false, error: error instanceof Error ? error.message : String(error) }
  }
  const hasMigratedState = addedCount > 0 || alreadyPresentCount > 0
  if (!hasMigratedState) {
    return { status: 'nothing_to_apply', report: reportFrom(preview, 0, discardedCount, quarantined), issues: sortedIssues, addedCount: 0, persisted: getPersistenceConsent(), markerPersisted: false }
  }
  completedMigrationSourcesInSession.add(preview.sourceKey)
  const persisted = getPersistenceConsent()
  let markerPersisted = false
  if (persisted && storage) {
    try { storage.setItem(migrationMarkerKey(preview.sourceKey), 'true'); markerPersisted = true } catch { markerPersisted = false }
  }
  return {
    status: addedCount === 0 ? 'already_migrated' : 'applied',
    report: reportFrom(preview, addedCount, discardedCount, quarantined, addedEntityIds), issues: sortedIssues, addedCount, persisted, markerPersisted,
  }
}
