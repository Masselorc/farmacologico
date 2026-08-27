import { beforeEach, describe, expect, it, vi } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, ConfigPayload, QuarantineItem } from '../../domain/types'
import { setPersistenceConsent } from '../../storage/consent'
import { serializedUtf8Bytes } from '../../storage/bytes'
import { validateProjectedConfigPayload } from '../../storage/config'
import { buildConfigExport, buildFullBackup } from '../../storage/export'
import { getDefaultFavorites, getDefaultSettings, resetStorageForTesting, setCustomIDBFactoryForTesting } from '../../storage/idb'
import { validateAndPreviewConfigImport, validateAndPreviewFullBackupImport } from '../../storage/import'
import { addQuarantineItem, getQuarantineItems } from '../../storage/quarantine'
import { SAFETY_LIMITS } from '../../validation/limits'

const emptyConfig = (): ConfigPayload => ({
  settings: getDefaultSettings(), favorites: getDefaultFavorites(), customSubstances: [],
  customProfiles: [], recipes: [], scenarios: [], protocols: [],
})

function record(id: string, note = ''): CalculationRecord {
  return {
    id, createdAt: '2026-08-27T08:00:00.000Z', display: { title: id, color: 'blue-500', note },
    type: 'reconstitution', versions: { reconstitutionEngineVersion: '1.0.0', datasetVersion: 1 },
    input: { vialMassMg: 10, diluentVolumeMl: 2, desiredDoseMcg: 100,
      syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 } },
    resultSnapshot: { concentrationMcgPerMl: 5000, doseVolumeMl: 0.02, syringeUnits: 2,
      theoreticalMaxDoses: 100, capacityExceeded: false, warnings: [],
      metadata: { reconstitutionEngineVersion: '1.0.0' } },
  }
}

function configAtBytes(target: number): ConfigPayload {
  const payload = emptyConfig()
  payload.customSubstances = [{
    id: 's', slug: 's', name: 'S', aliases: [''], category: 'other', tags: [],
    createdAt: '2026-08-27T08:00:00.000Z', updatedAt: '2026-08-27T08:00:00.000Z',
  }]
  const padding = target - serializedUtf8Bytes(payload)
  payload.customSubstances[0].aliases[0] = 'x'.repeat(padding)
  return payload
}

function recordAtBytes(target: number, id = 'record-exact'): CalculationRecord {
  const value = record(id)
  const padding = target - serializedUtf8Bytes(value)
  value.display.note = 'x'.repeat(padding)
  return value
}

function historyAtBytes(target: number): CalculationRecord[] {
  const history = Array.from({ length: 6 }, (_, index) => record(`history-${index}`))
  let remaining = target - serializedUtf8Bytes(history)
  for (const value of history) {
    const capacity = SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX - serializedUtf8Bytes(value)
    const allocated = Math.min(remaining, capacity)
    value.display.note = 'x'.repeat(allocated)
    remaining -= allocated
  }
  if (remaining !== 0) throw new Error(`Unable to construct exact history fixture: ${remaining}`)
  return history
}

function quarantineOptionsAtItemBytes(target: number, id: string) {
  let rawLength = Math.max(0, target - 200)
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate: QuarantineItem = {
      id, createdAt: '2026-08-27T08:00:00.000Z', source: 'config_import', errorCode: 'EXACT',
      originalUtf8Bytes: rawLength, rawExcerptUtf8: 'x'.repeat(rawLength), truncated: false,
    }
    const delta = target - serializedUtf8Bytes(candidate)
    if (delta === 0) return {
      id, createdAt: candidate.createdAt, source: candidate.source, errorCode: candidate.errorCode,
      originalUtf8Bytes: rawLength, rawExcerptUtf8: candidate.rawExcerptUtf8,
    }
    rawLength += delta
  }
  throw new Error(`Unable to construct quarantine item at ${target} bytes`)
}

describe('Fronteiras exatas dos budgets normativos (E6.2)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB); setPersistenceConsent(true); await resetStorageForTesting()
  })

  it('aceita ConfigPayload em 15 MiB exatos e rejeita +1 byte', () => {
    const exact = configAtBytes(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX)
    expect(serializedUtf8Bytes(exact)).toBe(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX)
    expect(validateProjectedConfigPayload(exact).ok).toBe(true)
    const over = structuredClone(exact)
    over.customSubstances[0].aliases[0] += 'x'
    expect(serializedUtf8Bytes(over)).toBe(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX + 1)
    expect(validateProjectedConfigPayload(over).ok).toBe(false)
  })

  it('aceita CalculationRecord em 8 MiB exatos e rejeita +1 byte', () => {
    const exact = recordAtBytes(SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX)
    expect(serializedUtf8Bytes(exact)).toBe(SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX)
    expect(buildFullBackup(emptyConfig(), [exact]).ok).toBe(true)
    exact.display.note += 'x'
    expect(serializedUtf8Bytes(exact)).toBe(SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX + 1)
    expect(buildFullBackup(emptyConfig(), [exact]).ok).toBe(false)
  })

  it('aceita history em 47 MiB exatos e rejeita +1 byte usando a serialização do array', () => {
    const exact = historyAtBytes(SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX)
    expect(serializedUtf8Bytes(exact)).toBe(SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX)
    expect(buildFullBackup(emptyConfig(), exact).ok).toBe(true)
    exact[exact.length - 1].display.note += 'x'
    expect(serializedUtf8Bytes(exact)).toBe(SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX + 1)
    expect(buildFullBackup(emptyConfig(), exact).ok).toBe(false)
  })

  it('aceita 500 registros e rejeita 501', () => {
    const exact = Array.from({ length: SAFETY_LIMITS.HISTORY_RECORDS_MAX }, (_, index) => record(`count-${index}`))
    expect(buildFullBackup(emptyConfig(), exact).ok).toBe(true)
    expect(buildFullBackup(emptyConfig(), [...exact, record('count-over')]).ok).toBe(false)
  })

  it('aceita files declarados exatamente em 16/64 MiB e rejeita +1 antes da leitura', async () => {
    const configBundle = buildConfigExport(emptyConfig())
    const fullBundle = buildFullBackup(emptyConfig(), [])
    expect(configBundle.ok && fullBundle.ok).toBe(true)
    if (!configBundle.ok || !fullBundle.ok) return

    const configText = vi.fn().mockResolvedValue(configBundle.json)
    expect((await validateAndPreviewConfigImport({ name: 'config.json', size: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX, text: configText })).ok).toBe(true)
    expect(configText).toHaveBeenCalledOnce()
    const configOverText = vi.fn().mockResolvedValue(configBundle.json)
    expect((await validateAndPreviewConfigImport({ name: 'config-over.json', size: SAFETY_LIMITS.CONFIG_IMPORT_BYTES_MAX + 1, text: configOverText })).ok).toBe(false)
    expect(configOverText).not.toHaveBeenCalled()

    const fullText = vi.fn().mockResolvedValue(fullBundle.json)
    expect((await validateAndPreviewFullBackupImport({ name: 'full.json', size: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX, text: fullText })).ok).toBe(true)
    expect(fullText).toHaveBeenCalledOnce()
    const fullOverText = vi.fn().mockResolvedValue(fullBundle.json)
    expect((await validateAndPreviewFullBackupImport({ name: 'full-over.json', size: SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX + 1, text: fullOverText })).ok).toBe(false)
    expect(fullOverText).not.toHaveBeenCalled()
  })

  it('aceita QuarantineItem em 256 KiB exatos e poda ao exceder o total de 1 MiB', async () => {
    const exactItem = await addQuarantineItem(quarantineOptionsAtItemBytes(
      SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX, 'individual-exact',
    ))
    expect(serializedUtf8Bytes(exactItem.item)).toBe(SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX)
    await resetStorageForTesting()

    // Quatro itens abaixo de 256 KiB; 2 colchetes + 3 vírgulas completam 1 MiB.
    const targets = [262_142, 262_143, 262_143, 262_143]
    for (let index = 0; index < targets.length; index += 1) {
      await addQuarantineItem(quarantineOptionsAtItemBytes(targets[index], `total-${index}`))
    }
    const exactTotal = await getQuarantineItems()
    expect(serializedUtf8Bytes(exactTotal)).toBe(SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX)
    await addQuarantineItem({ id: 'total-over', source: 'config_import', errorCode: 'OVER',
      originalUtf8Bytes: 1, rawExcerptUtf8: 'x' })
    const after = await getQuarantineItems()
    expect(serializedUtf8Bytes(after)).toBeLessThanOrEqual(SAFETY_LIMITS.QUARANTINE_TOTAL_BYTES_MAX)
    expect(after.some((item) => item.id === 'total-over')).toBe(true)
    expect(after.some((item) => item.id === 'total-0')).toBe(false)
  })

  it('prova que os subcaps 15 + 47 MiB preservam margem real sob o FullBackup de 64 MiB', () => {
    const result = buildFullBackup(configAtBytes(SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX),
      historyAtBytes(SAFETY_LIMITS.HISTORY_TOTAL_BYTES_MAX))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.bytes).toBeLessThan(SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX)
    expect(SAFETY_LIMITS.FULL_BACKUP_IMPORT_BYTES_MAX - result.bytes).toBeGreaterThan(2_000_000)
  })
})
