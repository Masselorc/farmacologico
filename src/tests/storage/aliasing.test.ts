import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import type { CalculationRecord, Scenario } from '../../domain/types'
import {
  addCalculationRecord,
  addQuarantineItem,
  getCalculationRecordById,
  getQuarantineItems,
  loadConfigPayload,
} from '../../storage'
import {
  putToStore,
  resetStorageForTesting,
  setCustomIDBFactoryForTesting,
  setPersistenceConsentForTesting,
} from '../../storage/testing'

type ReconstitutionRecord = Extract<CalculationRecord, { type: 'reconstitution' }>

function createSampleRecord(): ReconstitutionRecord {

  return {
    id: 'rec-alias-1',
    createdAt: '2026-08-27T08:00:00.000Z',
    display: { title: 'Título Original', color: 'blue-500' },
    type: 'reconstitution',
    versions: {
      reconstitutionEngineVersion: '1.0.0',
      datasetVersion: 1,
    },
    input: {
      vialMassMg: 10,
      diluentVolumeMl: 2,
      desiredDoseMcg: 100,
      syringe: {
        family: 'U-100',
        capacityUnits: 100,
        unitsPerMl: 100,
        graduationUnits: 1,
      },
    },
    resultSnapshot: {
      concentrationMcgPerMl: 5000,
      doseVolumeMl: 0.02,
      syringeUnits: 2,
      theoreticalMaxDoses: 100,
      capacityExceeded: false,
      warnings: [],
      metadata: { reconstitutionEngineVersion: '1.0.0' },
    },
  }
}

describe('Storage Immutability & Copy-in / Copy-out Defensive Aliasing (§11, E6.3)', () => {
  beforeEach(async () => {
    setCustomIDBFactoryForTesting(indexedDB)
    setPersistenceConsentForTesting(true)
    await resetStorageForTesting()
  })

  it('input alias em addCalculationRecord não altera o storage interno', async () => {
    const inputRecord = createSampleRecord()
    const addRes = await addCalculationRecord(inputRecord)
    expect(addRes.ok).toBe(true)

    // Muta profundamente o objeto original do chamador
    inputRecord.display.title = 'TÍTULO_MUTADO_EXTERNAMENTE'
    inputRecord.input.vialMassMg = 9999

    // Lê do storage
    const stored = await getCalculationRecordById(inputRecord.id)
    expect(stored?.display.title).toBe('Título Original')
    if (stored?.type === 'reconstitution') {
      expect(stored.input.vialMassMg).toBe(10)
    }
  })

  it('output alias em getCalculationRecordById não altera o storage interno', async () => {
    const inputRecord = createSampleRecord()
    await addCalculationRecord(inputRecord)

    const fetched = await getCalculationRecordById(inputRecord.id)
    expect(fetched).toBeDefined()
    if (fetched?.type === 'reconstitution') {
      // Muta profundamente o retorno
      fetched.display.title = 'TÍTULO_MUTADO_NO_RETORNO'
      fetched.input.desiredDoseMcg = 8888
    }

    // Lê novamente do storage
    const secondFetch = await getCalculationRecordById(inputRecord.id)
    expect(secondFetch?.display.title).toBe('Título Original')
    if (secondFetch?.type === 'reconstitution') {
      expect(secondFetch.input.desiredDoseMcg).toBe(100)
    }
  })



  it('output alias em loadConfigPayload não altera cenários/configurações do storage', async () => {
    const scenario: Scenario = {
      id: 'sc-alias-cfg',
      name: 'Nome Original',
      color: 'blue-500',
      source: {
        type: 'manual',
        pkParametersSnapshot: { halfLife: { value: 12, unit: 'hours' }, tmax: null },
      },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 43200000, tmaxMs: null },
      doses: [{ id: 'd1', amountMg: 50, time: '2026-08-27T08:00:00.000Z' }],
    }
    await putToStore('scenarios', scenario)

    const config1 = await loadConfigPayload()
    expect(config1.scenarios).toHaveLength(1)
    expect(config1.scenarios[0].name).toBe('Nome Original')

    // Muta o objeto retornado sem chamar mutateConfigPayload
    config1.scenarios[0].name = 'NOME_MUTADO_ILEGALMENTE'
    config1.scenarios.push({ ...scenario, id: 'sc-injected' })

    // Lê novamente
    const config2 = await loadConfigPayload()
    expect(config2.scenarios).toHaveLength(1)
    expect(config2.scenarios[0].name).toBe('Nome Original')
  })

  it('quarantine copy-out defensivo impede mutação externa dos itens quarentenados', async () => {
    await addQuarantineItem({
      source: 'config_import',
      errorCode: 'SYNTAX_ERROR',
      originalUtf8Bytes: 128,
      rawExcerptUtf8: 'corrupted json snippet',
    })


    const items1 = await getQuarantineItems()
    expect(items1).toHaveLength(1)
    expect(items1[0].errorCode).toBe('SYNTAX_ERROR')

    items1[0].errorCode = 'MUTATED_CODE'
    items1[0].rawExcerptUtf8 = 'mutated raw'

    const items2 = await getQuarantineItems()
    expect(items2[0].errorCode).toBe('SYNTAX_ERROR')
    expect(items2[0].rawExcerptUtf8).toBe('corrupted json snippet')
  })
})
