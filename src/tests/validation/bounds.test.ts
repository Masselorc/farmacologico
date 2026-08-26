import { describe, expect, it } from 'vitest'
import { boundsFromLimits } from '../../validation/bounds'
import { DOMAIN_LIMITS, HALF_LIFE_MS_MAX, MS_PER_DAY, SAFETY_LIMITS, TMAX_MS_MAX, UX_LIMITS } from '../../validation/limits'

describe('E5 Bounds — derivação pura para controles HTML (boundsFromLimits)', () => {
  const bounds = boundsFromLimits()

  it('deriva bounds de meia-vida em dias e em ms', () => {
    expect(bounds.halfLife.ms.min).toBe(DOMAIN_LIMITS.HALF_LIFE_MS_MIN)
    expect(bounds.halfLife.ms.max).toBe(HALF_LIFE_MS_MAX)
    expect(bounds.halfLife.days.min).toBe(DOMAIN_LIMITS.HALF_LIFE_MS_MIN / MS_PER_DAY)
    expect(bounds.halfLife.days.max).toBe(SAFETY_LIMITS.HALF_LIFE_DAYS_MAX)
  })

  it('deriva bounds de Tmax em dias e em ms', () => {
    expect(bounds.tmax.ms.min).toBe(0)
    expect(bounds.tmax.ms.max).toBe(TMAX_MS_MAX)
    expect(bounds.tmax.days.min).toBe(0)
    expect(bounds.tmax.days.max).toBe(SAFETY_LIMITS.TMAX_DAYS_MAX)
  })

  it('deriva bounds de doses e reconstituição', () => {
    expect(bounds.doseMg.max).toBe(SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX)
    expect(bounds.protocolTotalDoseMg.max).toBe(SAFETY_LIMITS.PROTOCOL_TOTAL_DOSE_MG_MAX)
    expect(bounds.vialMassMg.max).toBe(SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX)
    expect(bounds.diluentVolumeMl.max).toBe(SAFETY_LIMITS.RECON_DILUENT_ML_MAX)
    expect(bounds.desiredDoseMcg.max).toBe(SAFETY_LIMITS.RECON_DOSE_MCG_MAX)
    expect(bounds.syringeGraduationUnits.max).toBe(SAFETY_LIMITS.SYRINGE_GRADUATION_UNITS_MAX)
    expect(bounds.weeks.min).toBe(1)
    expect(bounds.weeks.max).toBe(SAFETY_LIMITS.WEEKS_MAX)
    expect(bounds.protocolComponentsCount.min).toBe(1)
    expect(bounds.protocolComponentsCount.max).toBe(SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX)
    expect(bounds.name.maxLength).toBe(UX_LIMITS.NAME_MAX_CHARS)
  })

  it('deriva limites de contagem de coleções e orçamentos de bytes', () => {
    expect(bounds.caps.scenariosMax).toBe(SAFETY_LIMITS.SCENARIOS_MAX)
    expect(bounds.caps.dosesPerScenarioMax).toBe(SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX)
    expect(bounds.caps.protocolsMax).toBe(SAFETY_LIMITS.PROTOCOLS_MAX)
    expect(bounds.caps.protocolComponentsMax).toBe(SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX)
    expect(bounds.caps.favoritesMax).toBe(UX_LIMITS.FAVORITES_MAX)
    expect(bounds.caps.historyRecordsMax).toBe(SAFETY_LIMITS.HISTORY_RECORDS_MAX)
    expect(bounds.caps.quarantineItemsMax).toBe(SAFETY_LIMITS.QUARANTINE_ITEMS_MAX)

    expect(bounds.bytes.configPayloadBytesMax).toBe(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX)
    expect(bounds.bytes.configImportBytesMax).toBe(SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX)
    expect(bounds.bytes.calculationRecordBytesMax).toBe(SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX)
    expect(bounds.bytes.historyTotalBytesMax).toBe(SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX)
    expect(bounds.bytes.fullBackupImportBytesMax).toBe(SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX)
    expect(bounds.bytes.quarantineItemBytesMax).toBe(SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX)
    expect(bounds.bytes.quarantineTotalBytesMax).toBe(SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX)
  })
})
