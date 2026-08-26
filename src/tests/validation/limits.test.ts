import { describe, expect, it } from 'vitest'
import {
  DOMAIN_LIMITS,
  HALF_LIFE_MS_MAX,
  MS_PER_DAY,
  SAFETY_LIMITS,
  TMAX_MS_MAX,
  UX_LIMITS,
} from '../../validation/limits'

describe('E5 LIMITS — integridade e fonte única de verdade (§6)', () => {
  it('DOMAIN_LIMITS contém todos os limites normativos de domínio', () => {
    expect(DOMAIN_LIMITS.HALF_LIFE_MS_MIN).toBe(1)
  })

  it('SAFETY_LIMITS contém todos os limites numéricos, temporais e de bytes normativos', () => {
    // Budgets de bytes
    expect(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX).toBe(15_728_640) // 15 MiB
    expect(SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX).toBe(16_777_216) // 16 MiB
    expect(SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX).toBe(8_388_608) // 8 MiB
    expect(SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX).toBe(49_283_072) // 47 MiB
    expect(SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX).toBe(67_108_864) // 64 MiB
    expect(SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX).toBe(262_144) // 256 KiB
    expect(SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX).toBe(1_048_576) // 1 MiB

    // Contagens e coleções
    expect(SAFETY_LIMITS.SCENARIOS_MAX).toBe(20)
    expect(SAFETY_LIMITS.DOSES_PER_SCENARIO_MAX).toBe(2000)
    expect(SAFETY_LIMITS.PROTOCOLS_MAX).toBe(200)
    expect(SAFETY_LIMITS.PROTOCOL_COMPONENTS_MAX).toBe(20)
    expect(SAFETY_LIMITS.WEEKS_MAX).toBe(520)
    expect(SAFETY_LIMITS.HISTORY_RECORDS_MAX).toBe(500)
    expect(SAFETY_LIMITS.QUARANTINE_ITEMS_MAX).toBe(5)

    // Tempos e doses PK
    expect(SAFETY_LIMITS.HALF_LIFE_DAYS_MAX).toBe(3650)
    expect(SAFETY_LIMITS.TMAX_DAYS_MAX).toBe(3650)
    expect(SAFETY_LIMITS.SIMULATION_DOSE_MG_MAX).toBe(1_000_000)
    expect(SAFETY_LIMITS.PROTOCOL_TOTAL_DOSE_MG_MAX).toBe(1_000_000)

    // Reconstituição
    expect(SAFETY_LIMITS.RECON_VIAL_MASS_MG_MAX).toBe(100_000)
    expect(SAFETY_LIMITS.RECON_DILUENT_ML_MAX).toBe(1000)
    expect(SAFETY_LIMITS.RECON_DOSE_MCG_MAX).toBe(1_000_000)
    expect(SAFETY_LIMITS.SYRINGE_GRADUATION_UNITS_MAX).toBe(100)
  })

  it('UX_LIMITS contém os limites de interface normativos', () => {
    expect(UX_LIMITS.NAME_MAX_CHARS).toBe(100)
    expect(UX_LIMITS.FAVORITES_MAX).toBe(100)
    expect(UX_LIMITS.GRADUATION_ERROR_WARN_THRESHOLD).toBe(0.05)
  })

  it('constantes derivadas em ms derivam diretamente dos dias normativos sem magic numbers', () => {
    expect(MS_PER_DAY).toBe(86_400_000)
    expect(HALF_LIFE_MS_MAX).toBe(3650 * 86_400_000)
    expect(TMAX_MS_MAX).toBe(3650 * 86_400_000)
  })
})
