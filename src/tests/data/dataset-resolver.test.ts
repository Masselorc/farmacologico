import { describe, expect, it } from 'vitest'
import { OFFICIAL_DATASET_V1 } from '../../data/substances'
import { validateOfficialDataset } from '../../data/substances/validate'
import { createOfficialEntityResolver, defaultOfficialResolver } from '../../data/substances/resolver'
import type { OfficialDataset } from '../../domain/library/types'

describe('E10 — Official Dataset Resolver & Validation', () => {
  describe('validateOfficialDataset com OFFICIAL_DATASET_V1', () => {
    it('valida dataset oficial v1 sem nenhum erro estrutural ou semântico', () => {
      const result = validateOfficialDataset(OFFICIAL_DATASET_V1)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('defaultOfficialResolver', () => {
    it('resolve substâncias e perfis oficiais v1 corretamente', () => {
      expect(defaultOfficialResolver.hasSubstance('retatrutida', 1)).toBe(true)
      expect(defaultOfficialResolver.hasSingleSubstance('retatrutida', 1)).toBe(true)

      // Blend é substance mas NÃO é singleSubstance
      expect(defaultOfficialResolver.hasSubstance('durateston-landergold', 1)).toBe(true)
      expect(defaultOfficialResolver.hasSingleSubstance('durateston-landergold', 1)).toBe(false)

      // ComponentOnly é singleSubstance
      expect(defaultOfficialResolver.hasSubstance('landergold-propionato', 1)).toBe(true)
      expect(defaultOfficialResolver.hasSingleSubstance('landergold-propionato', 1)).toBe(true)

      // Perfil composto
      expect(defaultOfficialResolver.hasProfile('retatrutida', 'legacy-v1', 1)).toBe(true)
      expect(defaultOfficialResolver.hasProfile('landergold-propionato', 'legacy-v1', 1)).toBe(true)

      // Blend NÃO tem profile próprio
      expect(defaultOfficialResolver.hasProfile('durateston-landergold', 'legacy-v1', 1)).toBe(false)

      // Entidades inexistentes
      expect(defaultOfficialResolver.hasSubstance('inexistente', 1)).toBe(false)
      expect(defaultOfficialResolver.hasProfile('retatrutida', 'perfil-inexistente', 1)).toBe(false)
    })
  })

  describe('Migrações de ID em datasets sintéticos (§9.1)', () => {
    const baseSyntheticDataset: OfficialDataset = {
      metadata: {
        datasetVersion: 3,
        updatedAt: '2026-09-02T12:00:00.000Z',
        substanceCount: 1,
        idMigrations: [
          // 2 saltos desordenados no array: sub-a -> sub-b (v2), sub-b -> sub-c (v3)
          {
            entityKind: 'substance',
            fromId: 'sub-b',
            toId: 'sub-c',
            sinceDatasetVersion: 3,
            reason: 'renomeação v3',
          },
          {
            entityKind: 'substance',
            fromId: 'sub-a',
            toId: 'sub-b',
            sinceDatasetVersion: 2,
            reason: 'renomeação v2',
          },
          // Profile migration composta
          {
            entityKind: 'profile',
            fromSubstanceId: 'sub-x',
            fromProfileId: 'prof-x',
            toSubstanceId: 'sub-c',
            toProfileId: 'prof-c',
            sinceDatasetVersion: 2,
            reason: 'migração de perfil composto',
          },
        ],
      },
      sources: [],
      substances: [
        {
          kind: 'single',
          id: 'sub-c',
          slug: 'sub-c',
          name: 'Substância C',
          aliases: [],
          category: 'peptide',
          tags: [],
          profiles: [
            {
              id: 'prof-c',
              route: 'unknown',
              halfLife: { value: 5, unit: 'days' },
              tmaxSpec: { kind: 'value', value: { value: 1, unit: 'days' } },
              origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
            },
          ],
        },
      ],
    }

    it('resolve cadeia de 2 saltos para substance a partir da versão 1 até o destino sub-c', () => {
      const resolver = createOfficialEntityResolver(baseSyntheticDataset)
      expect(resolver.hasSubstance('sub-a', 1)).toBe(true)
      expect(resolver.hasSubstance('sub-b', 2)).toBe(true)
      expect(resolver.hasSubstance('sub-c', 3)).toBe(true)
      expect(resolver.resolveSubstance('sub-a', 1)?.id).toBe('sub-c')
    })

    it('resolve migração de perfil com identidade composta', () => {
      const resolver = createOfficialEntityResolver(baseSyntheticDataset)
      expect(resolver.hasProfile('sub-x', 'prof-x', 1)).toBe(true)
      const resolved = resolver.resolveProfile('sub-x', 'prof-x', 1)
      expect(resolved?.substance.id).toBe('sub-c')
      expect(resolved?.profile.id).toBe('prof-c')
    })

    it('validador semântico detecta ciclos em idMigrations', () => {
      const cyclicDataset: OfficialDataset = {
        ...baseSyntheticDataset,
        metadata: {
          ...baseSyntheticDataset.metadata,
          idMigrations: [
            {
              entityKind: 'substance',
              fromId: 'sub-c',
              toId: 'sub-d',
              sinceDatasetVersion: 2,
              reason: 'step 1',
            },
            {
              entityKind: 'substance',
              fromId: 'sub-d',
              toId: 'sub-c',
              sinceDatasetVersion: 3,
              reason: 'step 2',
            },
          ],
        },
      }
      const val = validateOfficialDataset(cyclicDataset)
      expect(val.valid).toBe(false)
      expect(val.errors.some((e) => e.includes('Ciclo detectado'))).toBe(true)
    })

    it('validador semântico detecta bifurcação (fork) em idMigrations', () => {
      const forkDataset: OfficialDataset = {
        ...baseSyntheticDataset,
        metadata: {
          ...baseSyntheticDataset.metadata,
          idMigrations: [
            {
              entityKind: 'substance',
              fromId: 'sub-a',
              toId: 'sub-b',
              sinceDatasetVersion: 2,
              reason: 'fork 1',
            },
            {
              entityKind: 'substance',
              fromId: 'sub-a',
              toId: 'sub-c',
              sinceDatasetVersion: 2,
              reason: 'fork 2',
            },
          ],
        },
      }
      const val = validateOfficialDataset(forkDataset)
      expect(val.valid).toBe(false)
      expect(val.errors.some((e) => e.includes('Bifurcação'))).toBe(true)
    })

    it('validador semântico detecta destino final inexistente', () => {
      const deadEndDataset: OfficialDataset = {
        ...baseSyntheticDataset,
        metadata: {
          ...baseSyntheticDataset.metadata,
          idMigrations: [
            {
              entityKind: 'substance',
              fromId: 'sub-antigo',
              toId: 'sub-inexistente-total',
              sinceDatasetVersion: 2,
              reason: 'dead end',
            },
          ],
        },
      }
      const val = validateOfficialDataset(deadEndDataset)
      expect(val.valid).toBe(false)
      expect(val.errors.some((e) => e.includes('Destino final da migração'))).toBe(true)
    })
  })
})
