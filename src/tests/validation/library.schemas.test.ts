import { describe, expect, it } from 'vitest'
import {
  profileOriginSchema,
  pharmacokineticProfileSchema,
  singleSubstanceSchema,
  blendSubstanceSchema,
  officialDatasetSchema,
} from '../../validation/schemas/library'
import { CURRENT_DATASET_VERSION } from '../../domain/version'

describe('E10 — Schemas do Dataset e Biblioteca', () => {
  describe('profileOriginSchema', () => {
    it('aceita legacy_unattributed com reviewStatus legacy_unreviewed', () => {
      const valid = { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' }
      expect(profileOriginSchema.safeParse(valid).success).toBe(true)
    })

    it('rejeita literature sem sourceIds ou com sourceIds vazio', () => {
      const invalidNoSources = { kind: 'literature', reviewStatus: 'reviewed' }
      expect(profileOriginSchema.safeParse(invalidNoSources).success).toBe(false)

      const invalidEmptySources = { kind: 'literature', reviewStatus: 'reviewed', sourceIds: [] }
      expect(profileOriginSchema.safeParse(invalidEmptySources).success).toBe(false)
    })

    it('aceita literature com sourceIds não vazio', () => {
      const valid = { kind: 'literature', reviewStatus: 'reviewed', sourceIds: ['src-1'] }
      expect(profileOriginSchema.safeParse(valid).success).toBe(true)
    })

    it('rejeita user_defined com reviewStatus diferente de not_applicable', () => {
      const invalid = { kind: 'user_defined', reviewStatus: 'reviewed' }
      expect(profileOriginSchema.safeParse(invalid).success).toBe(false)

      const valid = { kind: 'user_defined', reviewStatus: 'not_applicable' }
      expect(profileOriginSchema.safeParse(valid).success).toBe(true)
    })
  })

  describe('blendSubstanceSchema', () => {
    it('rejeita Blend com components vazio', () => {
      const empty = {
        kind: 'blend',
        id: 'blend-1',
        slug: 'blend-1',
        name: 'Blend Vazio',
        aliases: [],
        tags: [],
        components: [],
        origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
      }
      expect(blendSubstanceSchema.safeParse(empty).success).toBe(false)
    })

    it('rejeita Blend com componentes cuja soma de proporções não é 1 (via proportionSumClose)', () => {
      const invalidSum = {
        kind: 'blend',
        id: 'blend-1',
        slug: 'blend-1',
        name: 'Blend Inválido',
        aliases: [],
        tags: [],
        components: [
          { substanceId: 'sub-1', profileId: 'p-1', proportion: 0.5 },
          { substanceId: 'sub-2', profileId: 'p-1', proportion: 0.3 },
        ],
        origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
      }
      expect(blendSubstanceSchema.safeParse(invalidSum).success).toBe(false)
    })

    it('rejeita Blend com proporção <= 0 ou não finita', () => {
      const negativeProp = {
        kind: 'blend',
        id: 'blend-1',
        slug: 'blend-1',
        name: 'Blend Negativo',
        aliases: [],
        tags: [],
        components: [
          { substanceId: 'sub-1', profileId: 'p-1', proportion: -0.2 },
          { substanceId: 'sub-2', profileId: 'p-1', proportion: 1.2 },
        ],
        origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
      }
      expect(blendSubstanceSchema.safeParse(negativeProp).success).toBe(false)
    })

    it('aceita Blend válido com 3 componentes somando 1', () => {
      const valid = {
        kind: 'blend',
        id: 'blend-1',
        slug: 'blend-1',
        name: 'Blend Válido',
        aliases: [],
        tags: [],
        components: [
          { substanceId: 'sub-1', profileId: 'p-1', proportion: 0.2 },
          { substanceId: 'sub-2', profileId: 'p-1', proportion: 0.4 },
          { substanceId: 'sub-3', profileId: 'p-1', proportion: 0.4 },
        ],
        origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
      }
      expect(blendSubstanceSchema.safeParse(valid).success).toBe(true)
    })
  })

  describe('officialDatasetSchema', () => {
    it('valida dataset metadata version e lista de substâncias e fontes', () => {
      const minimal = {
        metadata: {
          datasetVersion: CURRENT_DATASET_VERSION,
          updatedAt: '2026-09-02T12:00:00.000Z',
          substanceCount: 1,
          idMigrations: [],
        },
        sources: [],
        substances: [
          {
            kind: 'single',
            id: 'sub-1',
            slug: 'sub-1',
            name: 'Substância 1',
            aliases: [],
            category: 'other',
            tags: [],
            profiles: [
              {
                id: 'legacy-v1',
                route: 'unknown',
                halfLife: { value: 6, unit: 'days' },
                tmaxSpec: { kind: 'value', value: { value: 2, unit: 'days' } },
                origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
              },
            ],
          },
        ],
      }
      expect(officialDatasetSchema.safeParse(minimal).success).toBe(true)
    })
  })

  describe('pharmacokineticProfileSchema', () => {
    it('valida perfil farmacocinético válido', () => {
      const profile = {
        id: 'p-1',
        route: 'oral',
        halfLife: { value: 4, unit: 'hours' },
        tmaxSpec: { kind: 'value', value: { value: 1, unit: 'hours' } },
        origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
      }
      expect(pharmacokineticProfileSchema.safeParse(profile).success).toBe(true)
    })
  })

  describe('singleSubstanceSchema', () => {
    it('valida SingleSubstance com perfis', () => {
      const single = {
        kind: 'single',
        id: 'sub-test',
        slug: 'sub-test',
        name: 'Teste',
        aliases: [],
        category: 'other',
        tags: [],
        profiles: [
          {
            id: 'p-1',
            route: 'intramuscular',
            halfLife: { value: 2, unit: 'days' },
            tmaxSpec: { kind: 'instant' },
            origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
          },
        ],
      }
      expect(singleSubstanceSchema.safeParse(single).success).toBe(true)
    })
  })
})
