import type { PkParametersSnapshot, SelectedPkParameters, TimeUnit } from '../domain/types'
import { civilToInstantIso, isValidLocalDate, isValidLocalTime } from '../domain/shared/datetime'
import { toMilliseconds } from '../domain/units/convert'
import { DOMAIN_LIMITS, HALF_LIFE_MS_MAX, SAFETY_LIMITS, TMAX_MS_MAX, UX_LIMITS } from '../validation/limits'
import { scenarioSchema } from '../validation/schemas/scenario'
import { DEFAULT_MIGRATION_PALETTE, mapLegacyColor } from './colors'
import { isRecord, operationContext, optionalIdentity, parseUnknown, resolveOfficialMatches, sortIssues, validName } from './common'
import { makeLegacyStableId } from './ids'
import type { LegacyMigratedScenario, LegacyMigratedScenarioSource, LegacyMigrationPreview, LegacyScenarioLibraryResolver, MigrationIssue, MigrationPaletteEntry } from './types'

export interface MeiavidaMigrationOptions {
  assumedTimeZone: string
  ranAt?: string
  palette?: MigrationPaletteEntry[]
  resolver?: LegacyScenarioLibraryResolver
}

function timeUnit(value: unknown): TimeUnit | null {
  return value === 'minutes' || value === 'hours' || value === 'days' ? value : null
}

function issue(code: string, sourceIndex: number, discardedUnits: number): MigrationIssue {
  return { code, sourceIndex, discardedUnits, requiresQuarantine: false }
}

function parseDoseTime(value: unknown, assumedTimeZone: string): string | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4}-\d{2}-\d{2})T(.+)$/.exec(value)
  if (!match || !isValidLocalDate(match[1]!) || !isValidLocalTime(match[2]!)) return null
  try { return civilToInstantIso({ localDate: match[1], localTime: match[2], timeZone: assumedTimeZone }) } catch { return null }
}

function makeSource(
  name: string,
  selectedPkParameters: SelectedPkParameters,
  pkParametersSnapshot: PkParametersSnapshot,
  resolver: LegacyScenarioLibraryResolver | undefined,
): LegacyMigratedScenarioSource {
  const matches = resolveOfficialMatches(resolver
    ? () => resolver.resolve({ legacyName: name, selectedPkParameters, pkParametersSnapshot })
    : undefined)
  return matches.length === 1
    ? { type: 'library', ...matches[0]!, pkParametersSnapshot }
    : { type: 'manual', pkParametersSnapshot }
}

export function previewMeiavidaMigration(raw: unknown, options: MeiavidaMigrationOptions): LegacyMigrationPreview<LegacyMigratedScenario> {
  const context = operationContext(options)
  const parsed = parseUnknown(raw)
  const issues: MigrationIssue[] = []
  if (parsed.invalidJson) {
    issues.push({ code: 'LEGACY_SOURCE_INVALID_JSON', discardedUnits: 1, requiresQuarantine: true })
    return { sourceKey: 'meiavida:v2:data', ...context, entities: [], importedCount: 0, discardedCount: 1, colorRemaps: [], issues, originalUtf8Bytes: parsed.bytes }
  }
  if (!isRecord(parsed.value) || parsed.value.schemaVersion !== 2 || !Array.isArray(parsed.value.scenarios)) {
    issues.push({ code: 'LEGACY_SOURCE_INVALID_SHAPE', discardedUnits: 1, requiresQuarantine: true })
    return { sourceKey: 'meiavida:v2:data', ...context, entities: [], importedCount: 0, discardedCount: 1, colorRemaps: [], issues, originalUtf8Bytes: parsed.bytes }
  }
  const entities: LegacyMigratedScenario[] = []
  for (let index = 0; index < parsed.value.scenarios.length; index += 1) {
    const legacy = parsed.value.scenarios[index]
    if (!isRecord(legacy)) { issues.push(issue('LEGACY_SCENARIO_INVALID', index, 1)); continue }
    const name = validName(legacy.name, UX_LIMITS.NAME_MAX_CHARS)
    const halfLifeUnit = timeUnit(legacy.halfLifeUnit)
    const tmaxUnit = timeUnit(legacy.tmaxUnit)
    const displayUnit = legacy.displayUnit === 'mcg' || legacy.displayUnit === 'mg' || legacy.displayUnit === 'g' ? legacy.displayUnit : null
    if (!name || !halfLifeUnit || !tmaxUnit || !displayUnit || typeof legacy.halfLifeValue !== 'number' ||
      !Number.isFinite(legacy.halfLifeValue) || legacy.halfLifeValue <= 0 || typeof legacy.tmaxValue !== 'number' ||
      !Number.isFinite(legacy.tmaxValue) || legacy.tmaxValue < 0) {
      issues.push(issue('LEGACY_SCENARIO_INVALID', index, 1)); continue
    }
    const halfLifeMs = toMilliseconds(legacy.halfLifeValue, halfLifeUnit)
    const tmaxMs = legacy.tmaxValue === 0 ? null : toMilliseconds(legacy.tmaxValue, tmaxUnit)
    if (!Number.isFinite(halfLifeMs) || halfLifeMs < DOMAIN_LIMITS.HALF_LIFE_MS_MIN || halfLifeMs > HALF_LIFE_MS_MAX ||
      (tmaxMs !== null && (!Number.isFinite(tmaxMs) || tmaxMs > TMAX_MS_MAX))) {
      issues.push(issue('LEGACY_SCENARIO_INVALID', index, 1)); continue
    }
    const identity = optionalIdentity(legacy.id) ?? `index:${index}`
    const scenarioId = makeLegacyStableId('meiavida:scenario', identity)
    const selectedPkParameters = { halfLifeMs, tmaxMs }
    const pkParametersSnapshot: PkParametersSnapshot = {
      halfLife: { value: legacy.halfLifeValue, unit: halfLifeUnit },
      tmax: legacy.tmaxValue === 0 ? null : { value: legacy.tmaxValue, unit: tmaxUnit },
    }
    const doses = []
    if (Array.isArray(legacy.doses)) {
      for (let doseIndex = 0; doseIndex < legacy.doses.length; doseIndex += 1) {
        const dose = legacy.doses[doseIndex]
        if (!isRecord(dose) || typeof dose.amountMg !== 'number' || !Number.isFinite(dose.amountMg) || dose.amountMg <= 0 || dose.amountMg > SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX) {
          issues.push(issue('LEGACY_DOSE_INVALID', index, 1)); continue
        }
        const instant = parseDoseTime(dose.time, context.assumedTimeZone)
        if (!instant) { issues.push(issue('LEGACY_DOSE_TIME_INVALID', index, 1)); continue }
        if (doses.length >= SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX) { issues.push(issue('LEGACY_CONFIG_CAPACITY_EXCEEDED', index, 1)); continue }
        const doseIdentity = optionalIdentity(dose.id) ?? `index:${doseIndex}`
        doses.push({ id: makeLegacyStableId('meiavida:dose', identity, doseIdentity), amountMg: dose.amountMg, time: instant })
      }
    } else if (legacy.doses !== undefined) {
      issues.push(issue('LEGACY_DOSE_INVALID', index, 1))
    }
    const mappedColor = mapLegacyColor(legacy.color, options.palette ?? DEFAULT_MIGRATION_PALETTE)
    if (mappedColor.invalid) issues.push(issue('LEGACY_COLOR_DEFAULTED', index, 0))
    const scenario: LegacyMigratedScenario = {
      id: scenarioId, name, color: mappedColor.displayColor.paletteColor,
      source: makeSource(name, selectedPkParameters, pkParametersSnapshot, options.resolver),
      displayUnit, selectedPkParameters, doses,
    }
    const valid = scenarioSchema.safeParse(scenario)
    if (!valid.success) { issues.push(issue('LEGACY_SCENARIO_INVALID', index, 1)); continue }
    entities.push(scenario)
  }
  const sortedIssues = sortIssues(issues)
  return {
    sourceKey: 'meiavida:v2:data', ...context, entities, importedCount: entities.length,
    discardedCount: sortedIssues.reduce((sum, current) => sum + current.discardedUnits, 0),
    colorRemaps: [], issues: sortedIssues, originalUtf8Bytes: parsed.bytes,
  }
}
