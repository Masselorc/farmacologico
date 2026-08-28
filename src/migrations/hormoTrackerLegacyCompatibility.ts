import { isRecord, optionalIdentity, validName } from './common'

interface LegacyHormoTrackerBlendComponentDefinition {
  key: string
  suffix: string
  label: string
  index: number
}

interface LegacyHormoTrackerBlendDefinition {
  blendKey: string
  blendName: string
  storedPresetName: string
  components: readonly LegacyHormoTrackerBlendComponentDefinition[]
}

export const LEGACY_HORMOTRACKER_BLEND_DEFINITIONS: readonly LegacyHormoTrackerBlendDefinition[] = [
  {
    blendKey: 'durateston-landergold',
    blendName: 'Durateston LANDERGOLD',
    storedPresetName: 'Durateston LANDERGOLD (Blend)',
    components: [
      { key: 'propionato', suffix: ' - Propionato', label: 'Propionato', index: 0 },
      { key: 'fenilpropionato', suffix: ' - Fenilpropionato', label: 'Fenilpropionato', index: 1 },
      { key: 'isocaproato', suffix: ' - Isocaproato', label: 'Isocaproato', index: 2 },
    ],
  },
]

function normalizedDaysForSignature(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((day): day is number =>
    typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6,
  ))].sort((a, b) => a - b)
}

function legacyBlendMatch(record: Record<string, unknown>): {
  definition: LegacyHormoTrackerBlendDefinition
  component: LegacyHormoTrackerBlendComponentDefinition
} | null {
  const explicitBlendKey = optionalIdentity(record.blendKey)
  const explicitBlendName = validName(record.blendName)
  const explicitComponentKey = optionalIdentity(record.componentKey)
  if (explicitComponentKey && (explicitBlendKey || explicitBlendName)) {
    const definition = LEGACY_HORMOTRACKER_BLEND_DEFINITIONS.find((candidate) =>
      explicitBlendKey === candidate.blendKey || explicitBlendName === candidate.blendName,
    )
    const component = definition?.components.find((candidate) => candidate.key === explicitComponentKey)
    if (definition && component) return { definition, component }
  }

  const name = validName(record.name)
  if (!name) return null
  for (const definition of LEGACY_HORMOTRACKER_BLEND_DEFINITIONS) {
    const component = definition.components.find((candidate) => name === `${definition.blendName}${candidate.suffix}`)
    if (component) return { definition, component }
  }
  return null
}

/**
 * Reproduz somente a compatibilidade nominal do array histórico pré-groupId.
 * Envelopes v2 não passam por esta função.
 */
export function normalizeLegacyHormoTrackerDirectArray(records: unknown[]): unknown[] {
  return records.map((record) => {
    if (!isRecord(record) || optionalIdentity(record.groupId)) return record
    const match = legacyBlendMatch(record)
    if (!match) return record

    const numericId = Number(record.id)
    const baseIdentity = Number.isFinite(numericId)
      ? String(numericId - match.component.index)
      : `fallback-${typeof record.startDate === 'string' ? record.startDate : ''}`
    const signature = [
      match.definition.blendKey,
      typeof record.startDate === 'string' ? record.startDate : '',
      record.type === 'weekly' ? 'weekly' : 'single',
      record.weeksCount ?? 1,
      JSON.stringify(normalizedDaysForSignature(record.daysOfWeek)),
      baseIdentity,
    ].join('|')

    return {
      ...record,
      groupId: `legacy-compat:${signature}`,
      compoundKey: `${match.definition.blendKey}:${match.component.key}`,
      blendKey: match.definition.blendKey,
      blendName: match.definition.blendName,
      componentKey: match.component.key,
      componentLabel: match.component.label,
    }
  })
}

function findBlendDefinition(record: Record<string, unknown>): LegacyHormoTrackerBlendDefinition | undefined {
  const identity = optionalIdentity(record.blendKey) ?? optionalIdentity(record.key)
  const name = validName(record.name)
  return LEGACY_HORMOTRACKER_BLEND_DEFINITIONS.find((definition) =>
    identity === definition.blendKey || name === definition.storedPresetName || name === definition.blendName,
  )
}

function labelFromSuffix(value: unknown): string | null {
  const suffix = validName(value)
  if (!suffix) return null
  return validName(suffix.replace(/^\s*[-—]\s*/, ''))
}

export interface LegacyBlendEsterMetadata {
  blendKey?: string
  blendName: string
  componentKey?: string
  componentLabel: string
  componentName: string
}

/** Resolve o formato histórico real de ester: key + suffix, sem exigir name. */
export function legacyBlendEsterMetadata(
  record: Record<string, unknown>,
  ester: Record<string, unknown>,
): LegacyBlendEsterMetadata | null {
  const definition = findBlendDefinition(record)
  const componentKey = optionalIdentity(ester.componentKey) ?? optionalIdentity(ester.key)
  const definedComponent = definition?.components.find((component) =>
    component.key === componentKey || component.suffix === ester.suffix,
  )
  const componentLabel = validName(ester.componentLabel) ?? validName(ester.label) ?? validName(ester.name) ??
    labelFromSuffix(ester.suffix) ?? definedComponent?.label ?? validName(ester.key)
  if (!componentLabel) return null

  const parentName = validName(record.blendName) ?? definition?.blendName ??
    validName(record.name)?.replace(/\s*\(Blend\)\s*$/, '')
  if (!parentName) return null
  const suffix = validName(ester.suffix)
  const componentName = validName(ester.name) ?? (suffix ? validName(`${parentName}${suffix}`) : null) ?? componentLabel

  return {
    blendKey: optionalIdentity(record.blendKey) ?? optionalIdentity(record.key) ?? definition?.blendKey,
    blendName: parentName,
    componentKey: componentKey ?? definedComponent?.key,
    componentLabel,
    componentName,
  }
}
