import type { InstantIso, TimeZoneId } from '../domain/types'
import { isValidInstantIso, isValidTimeZoneId } from '../domain/shared/datetime'
import type { LegacyOfficialProfileMatch, MigrationIssue } from './types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validName(value: unknown, max = 100): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null
}

export function optionalIdentity(value: unknown): string | undefined {
  return validName(value, 200) ?? undefined
}

export function operationContext(options: { assumedTimeZone: string; ranAt?: string }): {
  assumedTimeZone: TimeZoneId
  ranAt: InstantIso
} {
  if (!isValidTimeZoneId(options.assumedTimeZone)) throw new Error('assumedTimeZone inválido')
  const ranAt = options.ranAt ?? new Date().toISOString()
  if (!isValidInstantIso(ranAt)) throw new Error('ranAt inválido')
  return { assumedTimeZone: options.assumedTimeZone, ranAt }
}

export function parseUnknown(raw: unknown): { value?: unknown; invalidJson: boolean; bytes: number } {
  if (typeof raw !== 'string') {
    let text: string
    try { text = JSON.stringify(raw) ?? '' } catch { text = '' }
    return { value: raw, invalidJson: false, bytes: new TextEncoder().encode(text).byteLength }
  }
  const bytes = new TextEncoder().encode(raw).byteLength
  try { return { value: JSON.parse(raw), invalidJson: false, bytes } } catch { return { invalidJson: true, bytes } }
}

export function validOfficialMatches(matches: unknown): LegacyOfficialProfileMatch[] {
  if (!Array.isArray(matches)) return []
  return matches.filter((item): item is LegacyOfficialProfileMatch =>
    isRecord(item) && validName(item.substanceId, 200) !== null && validName(item.profileId, 200) !== null &&
    typeof item.datasetVersion === 'number' && Number.isInteger(item.datasetVersion) && item.datasetVersion >= 0,
  )
}

export function resolveOfficialMatches(resolve: (() => unknown) | undefined): LegacyOfficialProfileMatch[] {
  if (!resolve) return []
  try { return validOfficialMatches(resolve()) } catch { return [] }
}

export function sortIssues(issues: MigrationIssue[]): MigrationIssue[] {
  return [...issues].sort((a, b) =>
    (a.sourceIndex ?? Number.MAX_SAFE_INTEGER) - (b.sourceIndex ?? Number.MAX_SAFE_INTEGER) ||
    (a.groupKey ?? '').localeCompare(b.groupKey ?? '') || a.code.localeCompare(b.code),
  )
}
