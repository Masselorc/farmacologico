import type { ColorRemapEntry, IsoWeekday, Protocol, ProtocolComponent, Schedule } from '../domain/types'
import { isValidLocalDate, isValidLocalTime } from '../domain/shared/datetime'
import { MS_PER_DAY } from '../domain/units/convert'
import { proportionSumClose } from '../domain/shared/tolerances'
import { SAFETY_LIMITS, UX_LIMITS } from '../validation/limits'
import { protocolSchema } from '../validation/schemas/protocol'
import { mapLegacyColor, DEFAULT_MIGRATION_PALETTE } from './colors'
import { isRecord, operationContext, optionalIdentity, parseUnknown, resolveOfficialMatches, sortIssues, validName } from './common'
import { makeLegacyStableId } from './ids'
import { legacyBlendEsterMetadata, legacyIdentity, normalizeLegacyHormoTrackerDirectArray } from './hormoTrackerLegacyCompatibility'
import type { LegacyMigrationPreview, LegacyOfficialProfileResolver, MigrationIssue, MigrationPaletteEntry } from './types'

export interface HormoTrackerMigrationOptions {
  assumedTimeZone: string
  ranAt?: string
  palette?: MigrationPaletteEntry[]
  resolver?: LegacyOfficialProfileResolver
}

interface Candidate {
  index: number
  groupKey: string
  identity: string
  name: string
  blendName?: string
  compoundKey?: string
  dose: number
  halfLife: number
  tmax: number
  schedule: Schedule
  label: string
  color: unknown
}

function issue(code: string, sourceIndex: number | undefined, groupKey: string | undefined, discardedUnits: number, requiresQuarantine = false): MigrationIssue {
  return { code, sourceIndex, groupKey, discardedUnits, requiresQuarantine }
}

export function mapLegacyJsWeekdays(days: unknown): IsoWeekday[] | null {
  if (!Array.isArray(days) || days.length === 0) return null
  if (days.some((day) => typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6)) return null
  return [...new Set(days.map((day) => (day === 0 ? 7 : day) as IsoWeekday))].sort((a, b) => a - b)
}

function scheduleFrom(record: Record<string, unknown>, timeZone: string): { schedule?: Schedule; code?: string } {
  if (typeof record.startDate !== 'string' || !isValidLocalDate(record.startDate)) return { code: 'LEGACY_PROTOCOL_INVALID' }
  let localTime = '08:00'
  if (record.startTime !== undefined && record.startTime !== null && record.startTime !== '') {
    if (typeof record.startTime !== 'string' || !isValidLocalTime(record.startTime)) return { code: 'LEGACY_PROTOCOL_INVALID' }
    localTime = record.startTime
  }
  if (record.type === 'single') return { schedule: { startDate: record.startDate, localTime, timeZone, recurrence: { type: 'single' } } }
  if (record.type !== 'weekly') return { code: 'LEGACY_PROTOCOL_INVALID' }
  const weekdays = mapLegacyJsWeekdays(record.daysOfWeek)
  if (!weekdays) return { code: 'LEGACY_WEEKDAY_INVALID' }
  if (typeof record.weeksCount !== 'number' || !Number.isInteger(record.weeksCount) || record.weeksCount < 1 || record.weeksCount > SAFETY_LIMITS.WEEKS_MAX) {
    return { code: 'LEGACY_WEEKS_INVALID' }
  }
  return { schedule: { startDate: record.startDate, localTime, timeZone, recurrence: { type: 'weekly', weekdays, weeks: record.weeksCount } } }
}

function finiteWithin(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function expandOldBlend(record: Record<string, unknown>, index: number): Record<string, unknown>[] | null {
  if (record.isBlend !== true) return [record]
  if (!Array.isArray(record.esters) || record.esters.length === 0 || !finiteWithin(record.dose, Number.MIN_VALUE, SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX)) return null
  const esters = record.esters
  const proportions = esters.map((ester) => isRecord(ester) ? ester.proportion : undefined)
  if (proportions.some((value) => !finiteWithin(value, Number.MIN_VALUE, 1)) || !proportionSumClose(proportions.filter((v): v is number => typeof v === 'number'))) return null
  const expanded: Record<string, unknown>[] = []
  for (let esterIndex = 0; esterIndex < esters.length; esterIndex += 1) {
    const ester = esters[esterIndex]
    if (!isRecord(ester) || !finiteWithin(ester.halfLife, Number.MIN_VALUE, SAFETY_LIMITS.HALF_LIFE_DAYS_MAX) ||
      !finiteWithin(ester.tmax, 0, SAFETY_LIMITS.TMAX_DAYS_MAX)) return null
    const metadata = legacyBlendEsterMetadata(record, ester)
    if (!metadata) return null
    const proportion = ester.proportion
    if (typeof proportion !== 'number') return null
    const parentIdentity = legacyIdentity(record.id) ?? legacyIdentity(record.key) ?? `blend:${index}`
    const groupIdentity = legacyIdentity(record.groupId) ?? parentIdentity
    const esterIdentity = legacyIdentity(ester.id) ?? legacyIdentity(ester.key) ?? `${parentIdentity}:ester:${esterIndex}`
    expanded.push({
      ...record,
      ...ester,
      id: esterIdentity,
      legacyComponentIdentity: esterIdentity,
      groupId: groupIdentity,
      compoundKey: ester.compoundKey ?? (metadata.blendKey && metadata.componentKey ? `${metadata.blendKey}:${metadata.componentKey}` : undefined),
      name: metadata.componentName,
      blendKey: metadata.blendKey,
      blendName: metadata.blendName,
      componentKey: metadata.componentKey,
      componentLabel: metadata.componentLabel,
      dose: record.dose * proportion,
      isBlend: false,
      esters: undefined,
    })
  }
  return expanded
}

function toCandidate(record: Record<string, unknown>, index: number, subIndex: number, timeZone: string): { candidate?: Candidate; code?: string } {
  const name = validName(record.name, UX_LIMITS.NAME_MAX_CHARS)
  if (!name) return { code: 'LEGACY_PROTOCOL_INVALID' }
  const groupIdentity = legacyIdentity(record.groupId)
  const ownIdentity = legacyIdentity(record.legacyComponentIdentity) ?? legacyIdentity(record.componentKey) ?? legacyIdentity(record.protocolId) ?? legacyIdentity(record.id) ?? `${index}:${subIndex}`
  const groupKey = groupIdentity ? `group:${groupIdentity}` : `record:${ownIdentity}`
  if (!finiteWithin(record.dose, Number.MIN_VALUE, SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX)) return { code: 'LEGACY_PROTOCOL_INVALID_DOSE' }
  if (!finiteWithin(record.halfLife, Number.MIN_VALUE, SAFETY_LIMITS.HALF_LIFE_DAYS_MAX) || !finiteWithin(record.tmax, 0, SAFETY_LIMITS.TMAX_DAYS_MAX)) return { code: 'LEGACY_PROTOCOL_INVALID' }
  const scheduled = scheduleFrom(record, timeZone)
  if (!scheduled.schedule) return { code: scheduled.code ?? 'LEGACY_PROTOCOL_INVALID' }
  return { candidate: {
    index, groupKey, identity: ownIdentity, name,
    blendName: validName(record.blendName, UX_LIMITS.NAME_MAX_CHARS) ?? undefined,
    compoundKey: optionalIdentity(record.compoundKey), dose: record.dose, halfLife: record.halfLife, tmax: record.tmax,
    schedule: scheduled.schedule, label: validName(record.componentLabel, UX_LIMITS.NAME_MAX_CHARS) ?? name, color: record.color,
  } }
}

function sameSchedule(a: Schedule, b: Schedule): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function previewHormoTrackerMigration(raw: unknown, options: HormoTrackerMigrationOptions): LegacyMigrationPreview<Protocol> {
  const context = operationContext(options)
  const parsed = parseUnknown(raw)
  const issues: MigrationIssue[] = []
  if (parsed.invalidJson) {
    issues.push(issue('LEGACY_SOURCE_INVALID_JSON', undefined, undefined, 1, true))
    return { sourceKey: 'hormoTrackerProtocols', ...context, entities: [], importedCount: 0, discardedCount: 1, colorRemaps: [], issues, originalUtf8Bytes: parsed.bytes }
  }
  const value = parsed.value
  const records = Array.isArray(value)
    ? normalizeLegacyHormoTrackerDirectArray(value)
    : isRecord(value) && value.schemaVersion === 2 && Array.isArray(value.protocols) ? value.protocols : null
  if (!records) {
    issues.push(issue('LEGACY_SOURCE_INVALID_SHAPE', undefined, undefined, 1, true))
    return { sourceKey: 'hormoTrackerProtocols', ...context, entities: [], importedCount: 0, discardedCount: 1, colorRemaps: [], issues, originalUtf8Bytes: parsed.bytes }
  }
  const candidates: Candidate[] = []
  const observedGroups = new Map<string, number>()
  const knownMaterializedGroups = new Set(records.filter(isRecord).map((record) => legacyIdentity(record.groupId)).filter((id): id is string => id !== undefined))
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (!isRecord(record)) { issues.push(issue('LEGACY_PROTOCOL_INVALID', index, undefined, 1)); continue }
    const groupId = legacyIdentity(record.groupId)
    const expanded = record.isBlend === true && groupId && knownMaterializedGroups.has(groupId) && records.some((sibling, siblingIndex) => siblingIndex !== index && isRecord(sibling) && sibling.groupId === groupId)
      ? [record]
      : expandOldBlend(record, index)
    if (!expanded) {
      const invalidGroupKey = groupId ? `group:${groupId}` : `record:${legacyIdentity(record.componentKey) ?? legacyIdentity(record.protocolId) ?? legacyIdentity(record.id) ?? `${index}:0`}`
      observedGroups.set(invalidGroupKey, index)
      issues.push(issue('LEGACY_PROTOCOL_INVALID', index, groupId, 1, true))
      continue
    }
    for (let subIndex = 0; subIndex < expanded.length; subIndex += 1) {
      const expandedRecord = expanded[subIndex]!
      const expandedGroupId = legacyIdentity(expandedRecord.groupId)
      const observedIdentity = expandedGroupId ? `group:${expandedGroupId}` : `record:${legacyIdentity(expandedRecord.componentKey) ?? legacyIdentity(expandedRecord.protocolId) ?? legacyIdentity(expandedRecord.id) ?? `${index}:${subIndex}`}`
      observedGroups.set(observedIdentity, index)
      const converted = toCandidate(expandedRecord, index, subIndex, context.assumedTimeZone)
      if (!converted.candidate) { issues.push(issue(converted.code ?? 'LEGACY_PROTOCOL_INVALID', index, groupId, 1)); continue }
      candidates.push(converted.candidate)
    }
  }
  const groups = new Map<string, Candidate[]>()
  for (const candidate of candidates) groups.set(candidate.groupKey, [...(groups.get(candidate.groupKey) ?? []), candidate])
  for (const [groupKey, sourceIndex] of observedGroups) {
    if (!groups.has(groupKey)) issues.push(issue('LEGACY_GROUP_EMPTY', sourceIndex, groupKey, 0, true))
  }
  const entities: Protocol[] = []
  const colorRemaps: ColorRemapEntry[] = []
  for (const [groupKey, unsorted] of groups) {
    const members = [...unsorted].sort((a, b) => a.identity.localeCompare(b.identity) || a.index - b.index)
    const first = members[0]!
    if (members.length > SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX) { issues.push(issue('LEGACY_GROUP_COMPONENT_LIMIT', first.index, groupKey, members.length, true)); continue }
    if (members.some((member) => !sameSchedule(first.schedule, member.schedule))) { issues.push(issue('LEGACY_GROUP_INCONSISTENT_SCHEDULE', first.index, groupKey, members.length, true)); continue }
    const totalDoseMg = members.reduce((sum, member) => sum + member.dose, 0)
    if (!finiteWithin(totalDoseMg, Number.MIN_VALUE, SAFETY_LIMITS.PROTOCOL_TOTAL_DOSE_MG_MAX)) { issues.push(issue('LEGACY_GROUP_TOTAL_DOSE_INVALID', first.index, groupKey, members.length, true)); continue }
    const protocolId = makeLegacyStableId('hormo:protocol', groupKey)
    const groupColorRemaps: ColorRemapEntry[] = []
    const components: ProtocolComponent[] = members.map((member) => {
      const componentId = makeLegacyStableId('hormo:component', groupKey, member.identity)
      const color = mapLegacyColor(member.color, options.palette ?? DEFAULT_MIGRATION_PALETTE)
      if (color.invalid) issues.push(issue('LEGACY_COLOR_DEFAULTED', member.index, groupKey, 0))
      if (color.remappedFrom) groupColorRemaps.push({ protocolId, componentId, legacyOriginalHex: color.remappedFrom, mappedPaletteColor: color.displayColor.paletteColor })
      const halfLifeMs = member.halfLife * MS_PER_DAY
      const tmaxMs = member.tmax === 0 ? null : member.tmax * MS_PER_DAY
      const matches = resolveOfficialMatches(options.resolver
        ? () => options.resolver!.resolve({ legacyName: member.name, halfLifeMs, tmaxMs, compoundKey: member.compoundKey })
        : undefined)
      return {
        id: componentId, label: member.label, proportion: member.dose / totalDoseMg,
        source: matches.length === 1 ? { type: 'library', ...matches[0]! } : { type: 'manual' },
        selectedPkParameters: { halfLifeMs, tmaxMs },
        pkParametersSnapshot: { halfLife: { value: member.halfLife, unit: 'days' }, tmax: member.tmax === 0 ? null : { value: member.tmax, unit: 'days' } },
        displayColor: color.displayColor,
      }
    })
    if (!proportionSumClose(components.map((component) => component.proportion))) { issues.push(issue('LEGACY_GROUP_PROPORTIONS_INVALID', first.index, groupKey, members.length, true)); continue }
    const blendNames = [...new Set(members.map((member) => member.blendName).filter((name): name is string => name !== undefined))]
    const protocol: Protocol = {
      id: protocolId, name: blendNames.length === 1 ? blendNames[0]! : first.name,
      totalDoseMg, schedule: first.schedule, components, createdAt: context.ranAt, updatedAt: context.ranAt,
    }
    const valid = protocolSchema.safeParse(protocol)
    if (!valid.success) { issues.push(issue('LEGACY_PROTOCOL_INVALID', first.index, groupKey, members.length, true)); continue }
    entities.push(valid.data)
    colorRemaps.push(...groupColorRemaps)
  }
  const sortedIssues = sortIssues(issues)
  colorRemaps.sort((a, b) => a.protocolId.localeCompare(b.protocolId) || a.componentId.localeCompare(b.componentId))
  return {
    sourceKey: 'hormoTrackerProtocols', ...context, entities, importedCount: entities.length,
    discardedCount: sortedIssues.reduce((sum, current) => sum + current.discardedUnits, 0), colorRemaps,
    issues: sortedIssues, originalUtf8Bytes: parsed.bytes,
  }
}
