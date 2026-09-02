import type { PaletteColorId } from '../../domain/types'

/**
 * Tabela canônica de aliases nominais emitidos ou aceitos por versões anteriores do FARMakit v1.
 * Estes aliases são válidos SOMENTE para normalização de leitura e importação histórica,
 * NUNCA como valores autorizados de PaletteColorId para dados novos.
 */
export const LEGACY_FARMAKIT_V1_COLOR_ALIASES: Readonly<Record<string, PaletteColorId>> = Object.freeze({
  'blue-500': '#2563eb',
  'emerald-500': '#059669',
  'amber-500': '#d97706',
  'purple-500': '#7c3aed',
  'violet-500': '#7c3aed',
  'pink-500': '#db2777',
  'cyan-500': '#0891b2',
  'green-500': '#059669',
  'red-500': '#e74c3c',
})

/**
 * Mapeia um alias de cor histórica v1 para o hex canônico da paleta atual,
 * ou retorna o valor inalterado caso não seja um alias reconhecido.
 */
export function mapLegacyColorAlias(value: unknown): unknown {
  if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_FARMAKIT_V1_COLOR_ALIASES, value)) {
    return LEGACY_FARMAKIT_V1_COLOR_ALIASES[value]
  }
  return value
}

export function isLegacyColorAlias(value: unknown): value is keyof typeof LEGACY_FARMAKIT_V1_COLOR_ALIASES {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_FARMAKIT_V1_COLOR_ALIASES, value)
}

/**
 * Normaliza cores em um Scenario bruto, preservando imutabilidade.
 */
export function normalizeScenarioColors<T>(scenario: T): T {
  if (!scenario || typeof scenario !== 'object') return scenario
  const sc = scenario as Record<string, unknown>
  if (typeof sc.color === 'string' && isLegacyColorAlias(sc.color)) {
    return {
      ...sc,
      color: mapLegacyColorAlias(sc.color),
    } as T
  }
  return scenario
}

/**
 * Normaliza cores em um Protocol bruto, preservando imutabilidade.
 */
export function normalizeProtocolColors<T>(protocol: T): T {
  if (!protocol || typeof protocol !== 'object') return protocol
  const proto = protocol as Record<string, unknown>
  if (!Array.isArray(proto.components)) return protocol

  let modified = false
  const components = proto.components.map((c) => {
    if (!c || typeof c !== 'object') return c
    const comp = c as Record<string, unknown>
    const dc = comp.displayColor as Record<string, unknown> | undefined
    if (dc && typeof dc.paletteColor === 'string' && isLegacyColorAlias(dc.paletteColor)) {
      modified = true
      return {
        ...comp,
        displayColor: {
          ...dc,
          paletteColor: mapLegacyColorAlias(dc.paletteColor),
        },
      }
    }
    return c
  })

  if (modified) {
    return {
      ...proto,
      components,
    } as T
  }
  return protocol
}

/**
 * Normaliza cores em um CalculationRecord bruto, preservando imutabilidade.
 */
export function normalizeCalculationRecordColors<T>(record: T): T {
  if (!record || typeof record !== 'object') return record
  const rec = record as Record<string, unknown>
  let modified = false
  const nextRec = { ...rec }

  // 1. display.color
  const display = rec.display as Record<string, unknown> | undefined
  if (display && typeof display.color === 'string' && isLegacyColorAlias(display.color)) {
    modified = true
    nextRec.display = {
      ...display,
      color: mapLegacyColorAlias(display.color),
    }
  }

  // 2. pharmacokinetics
  if (rec.type === 'pharmacokinetics') {
    // scenarios[].scenarioSnapshot.color
    if (Array.isArray(rec.scenarios)) {
      let scModified = false
      const scenarios = rec.scenarios.map((item) => {
        if (!item || typeof item !== 'object') return item
        const sItem = item as Record<string, unknown>
        if (sItem.scenarioSnapshot && typeof sItem.scenarioSnapshot === 'object') {
          const normalizedSnap = normalizeScenarioColors(sItem.scenarioSnapshot)
          if (normalizedSnap !== sItem.scenarioSnapshot) {
            scModified = true
            return {
              ...sItem,
              scenarioSnapshot: normalizedSnap,
            }
          }
        }
        return item
      })
      if (scModified) {
        modified = true
        nextRec.scenarios = scenarios
      }
    }

    // chartViewSnapshot.displayPointsByScenario[].color
    const chartView = rec.chartViewSnapshot as Record<string, unknown> | undefined
    if (chartView && Array.isArray(chartView.displayPointsByScenario)) {
      let cvModified = false
      const displayPointsByScenario = chartView.displayPointsByScenario.map((s) => {
        if (!s || typeof s !== 'object') return s
        const series = s as Record<string, unknown>
        if (typeof series.color === 'string' && isLegacyColorAlias(series.color)) {
          cvModified = true
          return {
            ...series,
            color: mapLegacyColorAlias(series.color),
          }
        }
        return s
      })
      if (cvModified) {
        modified = true
        nextRec.chartViewSnapshot = {
          ...chartView,
          displayPointsByScenario,
        }
      }
    }
  }

  // 3. protocol-analysis
  if (rec.type === 'protocol-analysis') {
    // snapshot.series[].color
    const snapshot = rec.snapshot as Record<string, unknown> | undefined
    if (snapshot && Array.isArray(snapshot.series)) {
      let seriesModified = false
      const series = snapshot.series.map((s) => {
        if (!s || typeof s !== 'object') return s
        const sEntry = s as Record<string, unknown>
        if (typeof sEntry.color === 'string' && isLegacyColorAlias(sEntry.color)) {
          seriesModified = true
          return {
            ...sEntry,
            color: mapLegacyColorAlias(sEntry.color),
          }
        }
        return s
      })
      if (seriesModified) {
        modified = true
        nextRec.snapshot = {
          ...snapshot,
          series,
        }
      }
    }

    // protocolsSnapshot[].components[].displayColor.paletteColor
    if (Array.isArray(rec.protocolsSnapshot)) {
      let protoModified = false
      const protocolsSnapshot = rec.protocolsSnapshot.map((p) => {
        const normalized = normalizeProtocolColors(p)
        if (normalized !== p) {
          protoModified = true
          return normalized
        }
        return p
      })
      if (protoModified) {
        modified = true
        nextRec.protocolsSnapshot = protocolsSnapshot
      }
    }
  }

  return modified ? (nextRec as T) : record
}

/**
 * Normaliza cores em um StoredHistoryEntry ou CalculationRecord bruto do IndexedDB.
 */
export function normalizeHistoryValue<T>(value: T): T {
  if (!value || typeof value !== 'object') return value
  const entry = value as Record<string, unknown>
  if (entry.record && typeof entry.record === 'object') {
    const normalizedRecord = normalizeCalculationRecordColors(entry.record)
    if (normalizedRecord !== entry.record) {
      return {
        ...entry,
        record: normalizedRecord,
      } as T
    }
    return value
  }
  // Registro plano legado
  return normalizeCalculationRecordColors(value)
}

/**
 * Normaliza cores em um ConfigPayload bruto.
 */
export function normalizeConfigPayloadColors<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload
  const pl = payload as Record<string, unknown>
  let modified = false
  const nextPl = { ...pl }

  if (Array.isArray(pl.scenarios)) {
    let scModified = false
    const scenarios = pl.scenarios.map((s) => {
      const normalized = normalizeScenarioColors(s)
      if (normalized !== s) scModified = true
      return normalized
    })
    if (scModified) {
      modified = true
      nextPl.scenarios = scenarios
    }
  }

  if (Array.isArray(pl.protocols)) {
    let prModified = false
    const protocols = pl.protocols.map((p) => {
      const normalized = normalizeProtocolColors(p)
      if (normalized !== p) prModified = true
      return normalized
    })
    if (prModified) {
      modified = true
      nextPl.protocols = protocols
    }
  }

  return modified ? (nextPl as T) : payload
}

/**
 * Normaliza cores em um ConfigExportBundle bruto.
 */
export function normalizeConfigExportBundleColors<T>(bundle: T): T {
  if (!bundle || typeof bundle !== 'object') return bundle
  const b = bundle as Record<string, unknown>
  if (b.payload && typeof b.payload === 'object') {
    const normalizedPayload = normalizeConfigPayloadColors(b.payload)
    if (normalizedPayload !== b.payload) {
      return {
        ...b,
        payload: normalizedPayload,
      } as T
    }
  }
  return bundle
}

/**
 * Normaliza cores em um FullBackupBundle bruto.
 */
export function normalizeFullBackupBundleColors<T>(bundle: T): T {
  if (!bundle || typeof bundle !== 'object') return bundle
  const b = bundle as Record<string, unknown>
  let modified = false
  const nextBundle = { ...b }

  if (b.payload && typeof b.payload === 'object') {
    const normalizedPayload = normalizeConfigPayloadColors(b.payload)
    if (normalizedPayload !== b.payload) {
      modified = true
      nextBundle.payload = normalizedPayload
    }
  }

  if (Array.isArray(b.history)) {
    let hModified = false
    const history = b.history.map((rec) => {
      const normalized = normalizeCalculationRecordColors(rec)
      if (normalized !== rec) hModified = true
      return normalized
    })
    if (hModified) {
      modified = true
      nextBundle.history = history
    }
  }

  return modified ? (nextBundle as T) : bundle
}
