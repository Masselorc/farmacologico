import { describe, expect, it } from 'vitest'
import {
  getVisibleSubstances,
  OFFICIAL_DATASET_V1,
} from '../../data/substances'
import {
  createOfficialEntityResolver,
} from '../../data/substances/resolver'
import { validateRuntimeOfficialDataset } from '../../data/substances/validate'
import { CURRENT_DATASET_VERSION } from '../../domain/version'
import type { OfficialDataset, SingleSubstance } from '../../domain/library/types'

function makeDeprecatedSubstance(): SingleSubstance {
  return {
    kind: 'single',
    id: 'substancia-deprecated-e10-2',
    slug: 'substancia-deprecated-e10-2',
    name: 'Substância descontinuada E10.2',
    aliases: [],
    category: 'other',
    tags: [],
    deprecated: true,
    profiles: [
      {
        id: 'perfil-deprecated-e10-2',
        route: 'unknown',
        halfLife: { value: 6, unit: 'days' },
        tmaxSpec: { kind: 'instant' },
        origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
      },
    ],
  }
}

function makeDatasetWithDeprecatedSubstance(): OfficialDataset {
  const deprecatedSubstance = makeDeprecatedSubstance()
  return {
    ...OFFICIAL_DATASET_V1,
    metadata: {
      ...OFFICIAL_DATASET_V1.metadata,
      substanceCount: OFFICIAL_DATASET_V1.substances.length + 1,
    },
    substances: [...OFFICIAL_DATASET_V1.substances, deprecatedSubstance],
  }
}

describe('E10.2 — QA de identidade e versionamento do dataset', () => {
  it('mantém entidade deprecated resolvível, mas oculta no seletor comum', () => {
    const dataset = makeDatasetWithDeprecatedSubstance()
    const resolver = createOfficialEntityResolver(dataset)
    const deprecatedId = 'substancia-deprecated-e10-2'
    const deprecatedProfileId = 'perfil-deprecated-e10-2'

    expect(resolver.hasSubstance(deprecatedId, CURRENT_DATASET_VERSION)).toBe(true)
    expect(resolver.resolveSubstance(deprecatedId, CURRENT_DATASET_VERSION)?.id).toBe(deprecatedId)
    expect(resolver.hasProfile(deprecatedId, deprecatedProfileId, CURRENT_DATASET_VERSION)).toBe(true)
    expect(
      resolver.resolveProfile(deprecatedId, deprecatedProfileId, CURRENT_DATASET_VERSION)?.profile.id,
    ).toBe(deprecatedProfileId)

    const visibleIds = getVisibleSubstances(dataset).map((substance) => substance.id)
    expect(visibleIds).not.toContain(deprecatedId)
  })

  it('aceita no runtime o dataset cuja versão coincide com a versão corrente', () => {
    const result = validateRuntimeOfficialDataset(OFFICIAL_DATASET_V1)

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejeita dataset com metadata.datasetVersion futura no runtime', () => {
    const futureDataset: OfficialDataset = {
      ...OFFICIAL_DATASET_V1,
      metadata: {
        ...OFFICIAL_DATASET_V1.metadata,
        datasetVersion: CURRENT_DATASET_VERSION + 1,
      },
    }

    const result = validateRuntimeOfficialDataset(futureDataset)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('datasetVersion'))).toBe(true)
  })
})
