import { DOMAIN_LIMITS, HALF_LIFE_MS_MAX, MS_PER_DAY, SAFETY_LIMITS, TMAX_MS_MAX, UX_LIMITS } from './limits'

// Derivação centralizada de bounds para controles HTML (§6, "Pipeline LIMITS → Zod → HTML").
// HTML é primeira barreira de UX; Zod continua sendo autoridade estrutural e motores a autoridade científica.

export interface HtmlNumberBounds {
  min?: number
  max?: number
  step: number | 'any'
}

export interface HtmlTextBounds {
  maxLength: number
}

export interface LimitsBounds {
  halfLife: {
    days: HtmlNumberBounds
    ms: HtmlNumberBounds
  }
  tmax: {
    days: HtmlNumberBounds
    ms: HtmlNumberBounds
  }
  doseMg: HtmlNumberBounds
  protocolTotalDoseMg: HtmlNumberBounds
  vialMassMg: HtmlNumberBounds
  diluentVolumeMl: HtmlNumberBounds
  desiredDoseMcg: HtmlNumberBounds
  syringeGraduationUnits: HtmlNumberBounds
  syringeCapacityUnits: HtmlNumberBounds
  weeks: HtmlNumberBounds
  protocolComponentsCount: HtmlNumberBounds
  name: HtmlTextBounds
  caps: {
    scenariosMax: number
    dosesPerScenarioMax: number
    protocolsMax: number
    protocolComponentsMax: number
    favoritesMax: number
    historyRecordsMax: number
    quarantineItemsMax: number
    weeksMax: number
  }
  bytes: {
    configPayloadBytesMax: number
    configImportBytesMax: number
    calculationRecordBytesMax: number
    historyTotalBytesMax: number
    fullBackupImportBytesMax: number
    quarantineItemBytesMax: number
    quarantineTotalBytesMax: number
  }
}

export function boundsFromLimits(): LimitsBounds {
  return {
    halfLife: {
      days: {
        min: DOMAIN_LIMITS.HALF_LIFE_MS_MIN / MS_PER_DAY,
        max: SAFETY_LIMITS.HALF_LIFE_DAYS_MAX,
        step: 'any',
      },
      ms: {
        min: DOMAIN_LIMITS.HALF_LIFE_MS_MIN,
        max: HALF_LIFE_MS_MAX,
        step: 'any',
      },
    },
    tmax: {
      days: {
        min: 0,
        max: SAFETY_LIMITS.TMAX_DAYS_MAX,
        step: 'any',
      },
      ms: {
        min: 0,
        max: TMAX_MS_MAX,
        step: 'any',
      },
    },
    doseMg: {
      min: 0,
      max: SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX,
      step: 'any',
    },
    protocolTotalDoseMg: {
      min: 0,
      max: SAFETY_LIMITS.PROTOCOL_TOTAL_DOSE_MG_MAX,
      step: 'any',
    },
    vialMassMg: {
      min: 0,
      max: SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX,
      step: 'any',
    },
    diluentVolumeMl: {
      min: 0,
      max: SAFETY_LIMITS.RECON_DILUENT_ML_MAX,
      step: 'any',
    },
    desiredDoseMcg: {
      min: 0,
      max: SAFETY_LIMITS.RECON_DOSE_MCG_MAX,
      step: 'any',
    },
    syringeGraduationUnits: {
      min: 0,
      max: SAFETY_LIMITS.SYRINGE_GRADUATION_UNITS_MAX,
      step: 'any',
    },
    syringeCapacityUnits: {
      min: 0,
      step: 'any',
    },
    weeks: {
      min: 1,
      max: SAFETY_LIMITS.WEEKS_MAX,
      step: 1,
    },
    protocolComponentsCount: {
      min: 1,
      max: SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX,
      step: 1,
    },
    name: {
      maxLength: UX_LIMITS.NAME_MAX_CHARS,
    },
    caps: {
      scenariosMax: SAFETY_LIMITS.SCENARIOS_MAX,
      dosesPerScenarioMax: SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX,
      protocolsMax: SAFETY_LIMITS.PROTOCOLS_MAX,
      protocolComponentsMax: SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX,
      favoritesMax: UX_LIMITS.FAVORITES_MAX,
      historyRecordsMax: SAFETY_LIMITS.HISTORY_RECORDS_MAX,
      quarantineItemsMax: SAFETY_LIMITS.QUARANTINE_ITEMS_MAX,
      weeksMax: SAFETY_LIMITS.WEEKS_MAX,
    },
    bytes: {
      configPayloadBytesMax: SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX,
      configImportBytesMax: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX,
      calculationRecordBytesMax: SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX,
      historyTotalBytesMax: SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX,
      fullBackupImportBytesMax: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX,
      quarantineItemBytesMax: SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX,
      quarantineTotalBytesMax: SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX,
    },
  }
}
