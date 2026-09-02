import { describe, expect, it } from 'vitest'
import type { ConfigPayload, CustomProfile, CustomSubstance, Protocol, ReconstitutionRecipe, Scenario } from '../../domain/types'
import { getDefaultFavorites, getDefaultSettings } from '../../storage/idb'
import { validateConfigReferences } from '../../storage/references'

function createBasePayload(): ConfigPayload {
  return {
    settings: getDefaultSettings(),
    favorites: getDefaultFavorites(),
    customSubstances: [],
    customProfiles: [],
    recipes: [],
    scenarios: [],
    protocols: [],
  }
}

describe('Config References Validation (§6, §11, E6.1)', () => {
  it('aprova um payload válido e consistente', () => {
    const substance: CustomSubstance = {
      id: 'sub-1',
      slug: 'sub-1',
      name: 'Substância 1',
      aliases: [],
      category: 'peptide',
      tags: [],
      createdAt: '2026-08-27T08:00:00.000Z',
      updatedAt: '2026-08-27T08:00:00.000Z',
    }

    const profile: CustomProfile = {
      id: 'prof-1',
      owner: { type: 'custom', substanceId: 'sub-1' },
      route: 'subcutaneous',
      halfLife: { value: 24, unit: 'hours' },
      tmaxSpec: { kind: 'instant' },
      origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      createdAt: '2026-08-27T08:00:00.000Z',
      updatedAt: '2026-08-27T08:00:00.000Z',
    }

    const recipe: ReconstitutionRecipe = {
      id: 'rec-1',
      name: 'Receita 1',
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
      createdAt: '2026-08-27T08:00:00.000Z',
      updatedAt: '2026-08-27T08:00:00.000Z',
    }

    const scenario: Scenario = {
      id: 'sc-1',
      name: 'Cenário 1',
      color: '#2563eb',
      source: {
        type: 'custom_profile',
        customProfileId: 'prof-1',
        pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
      },
      displayUnit: 'mg',
      selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
      doses: [],
    }

    const protocol: Protocol = {
      id: 'pr-1',
      name: 'Protocolo 1',
      totalDoseMg: 100,
      schedule: {
        startDate: '2026-08-27',
        localTime: '08:00',
        timeZone: 'America/Sao_Paulo',
        recurrence: { type: 'single' },
      },
      components: [
        {
          id: 'cmp-1',
          label: 'Componente 1',
          source: { type: 'custom_profile', customProfileId: 'prof-1' },
          proportion: 1,
          selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
          pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
          displayColor: { paletteColor: '#2563eb' },
        },
      ],
      createdAt: '2026-08-27T08:00:00.000Z',
      updatedAt: '2026-08-27T08:00:00.000Z',
    }

    const payload: ConfigPayload = {
      ...createBasePayload(),
      customSubstances: [substance],
      customProfiles: [profile],
      recipes: [recipe],
      scenarios: [scenario],
      protocols: [protocol],
      favorites: {
        substances: [{ type: 'custom', substanceId: 'sub-1' }],
        recipeIds: ['rec-1'],
      },
    }

    const res = validateConfigReferences(payload)
    expect(res.valid).toBe(true)
    expect(res.error).toBeUndefined()
  })

  it('rejeita IDs duplicados em coleções', () => {
    const payload = createBasePayload()
    payload.recipes = [
      {
        id: 'dup-rec',
        name: 'R1',
        input: { vialMassMg: 1, diluentVolumeMl: 1, desiredDoseMcg: 1, syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 } },
        createdAt: '2026-08-27T08:00:00.000Z',
        updatedAt: '2026-08-27T08:00:00.000Z',
      },
      {
        id: 'dup-rec',
        name: 'R2',
        input: { vialMassMg: 1, diluentVolumeMl: 1, desiredDoseMcg: 1, syringe: { family: 'U-100', capacityUnits: 100, unitsPerMl: 100, graduationUnits: 1 } },
        createdAt: '2026-08-27T08:00:00.000Z',
        updatedAt: '2026-08-27T08:00:00.000Z',
      },
    ]

    const res = validateConfigReferences(payload)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('ID duplicado em recipes')
  })

  it('rejeita CustomProfile com owner substanceId inexistente', () => {
    const payload = createBasePayload()
    payload.customProfiles = [
      {
        id: 'prof-orphan',
        owner: { type: 'custom', substanceId: 'non-existent-sub' },
        route: 'oral',
        halfLife: { value: 12, unit: 'hours' },
        tmaxSpec: { kind: 'instant' },
        origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
        createdAt: '2026-08-27T08:00:00.000Z',
        updatedAt: '2026-08-27T08:00:00.000Z',
      },
    ]

    const res = validateConfigReferences(payload)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('referencia custom substance inexistente')
  })

  it('rejeita Scenario com customProfileId inexistente', () => {
    const payload = createBasePayload()
    payload.scenarios = [
      {
        id: 'sc-orphan',
        name: 'Cenário Órfão',
        color: '#e74c3c',
        source: {
          type: 'custom_profile',
          customProfileId: 'missing-profile',
          pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
        },
        displayUnit: 'mg',
        selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
        doses: [],
      },
    ]

    const res = validateConfigReferences(payload)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('referencia customProfileId inexistente')
  })

  it('rejeita ProtocolComponent com customProfileId inexistente', () => {
    const payload = createBasePayload()
    payload.protocols = [
      {
        id: 'pr-orphan',
        name: 'Protocolo Órfão',
        totalDoseMg: 50,
        schedule: {
          startDate: '2026-08-27',
          localTime: '08:00',
          timeZone: 'America/Sao_Paulo',
          recurrence: { type: 'single' },
        },
        components: [
          {
            id: 'cmp-orphan',
            label: 'Componente Órfão',
            source: { type: 'custom_profile', customProfileId: 'missing-prof' },
            proportion: 1,
            selectedPkParameters: { halfLifeMs: 86400000, tmaxMs: null },
            pkParametersSnapshot: { halfLife: { value: 24, unit: 'hours' }, tmax: null },
            displayColor: { paletteColor: '#e74c3c' },
          },
        ],
        createdAt: '2026-08-27T08:00:00.000Z',
        updatedAt: '2026-08-27T08:00:00.000Z',
      },
    ]

    const res = validateConfigReferences(payload)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('referencia customProfileId inexistente')
  })

  it('rejeita Favorites com referências órfãs ou datasetVersion futuro', () => {
    const payload = createBasePayload()
    payload.favorites.substances = [{ type: 'custom', substanceId: 'missing-sub' }]

    const res1 = validateConfigReferences(payload)
    expect(res1.valid).toBe(false)
    expect(res1.error).toContain('Favorite referencia custom substanceId inexistente')

    const payloadFuture = createBasePayload()
    payloadFuture.favorites.substances = [{ type: 'official', substanceId: 'official-1', datasetVersion: 999 }]

    const res2 = validateConfigReferences(payloadFuture, 1)
    expect(res2.valid).toBe(false)
    expect(res2.error).toContain('datasetVersion futuro')
  })
})
