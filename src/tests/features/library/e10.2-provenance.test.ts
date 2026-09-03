import { describe, expect, it } from 'vitest'
import { OFFICIAL_DATASET_V1 } from '../../../data/substances'
import { buildLibraryView } from '../../../features/library/lib/view'
import {
  createComparatorIntent,
  createProtocolIntent,
} from '../../../features/library/lib/intents'
import { resolveProfileParameters } from '../../../features/library/lib/selection'
import type { CustomProfile, CustomSubstance } from '../../../domain/data-management/types'

const officialItem = buildLibraryView(OFFICIAL_DATASET_V1).find((item) => item.id === 'retatrutida')
if (!officialItem || officialItem.substance.kind !== 'single') {
  throw new Error('Fixture oficial retatrutida não é SingleSubstance')
}
const officialSubstance = officialItem.substance
const officialProfile = officialItem.profileViews[0]!

const customProfile: CustomProfile = {
  id: 'cp-e102-official',
  owner: { type: 'official', substanceId: 'retatrutida' },
  route: 'subcutaneous',
  halfLife: { value: 5, unit: 'days' },
  tmaxSpec: { kind: 'value', value: { value: 1, unit: 'days' } },
  origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
  createdAt: '2026-09-03T12:00:00Z',
  updatedAt: '2026-09-03T12:00:00Z',
}

const customSubstance: CustomSubstance = {
  id: 'custom-e102-substance',
  slug: 'custom-e102-substance',
  name: 'Substância E10.2',
  aliases: [],
  category: 'other',
  tags: [],
  createdAt: '2026-09-03T12:00:00Z',
  updatedAt: '2026-09-03T12:00:00Z',
}

const customSubstanceProfile: CustomProfile = {
  ...customProfile,
  id: 'cp-e102-custom-substance',
  owner: { type: 'custom', substanceId: customSubstance.id },
}

function resolvedWith(overrides: { halfLifeMs?: number; tmaxMs?: number | null }) {
  const resolved = resolveProfileParameters(officialProfile.profile)
  return {
    ...resolved,
    selectedPkParameters: {
      ...resolved.selectedPkParameters,
      ...overrides,
    },
  }
}

describe('E10.2 — proveniência e validação dos builders', () => {
  it('preserva official como library', () => {
    const intent = createComparatorIntent({
      substance: officialSubstance,
      selectedProfile: officialProfile,
    })

    expect(intent.source).toMatchObject({
      type: 'library',
      substanceId: 'retatrutida',
      profileId: officialProfile.profile.id,
      datasetVersion: OFFICIAL_DATASET_V1.metadata.datasetVersion,
    })
  })

  it('preserva custom_profile em substância oficial', () => {
    const item = buildLibraryView(OFFICIAL_DATASET_V1, [], [customProfile]).find(
      (candidate) => candidate.id === 'retatrutida',
    )
    if (!item || item.substance.kind !== 'single') {
      throw new Error('Fixture oficial inválida')
    }
    const selectedProfile = item.profileViews.find((view) => view.provenance === 'custom_profile')!

    const intent = createComparatorIntent({
      substance: item.substance,
      selectedProfile,
    })

    expect(intent.source).toEqual({
      type: 'custom_profile',
      customProfileId: customProfile.id,
      pkParametersSnapshot: expect.any(Object),
    })
  })

  it('preserva custom_profile em custom substance', () => {
    const item = buildLibraryView(OFFICIAL_DATASET_V1, [customSubstance], [customSubstanceProfile]).find(
      (candidate) => candidate.id === customSubstance.id,
    )
    if (!item || item.substance.kind !== 'single') {
      throw new Error('Fixture custom inválida')
    }
    const selectedProfile = item.profileViews[0]!

    const intent = createProtocolIntent({
      substance: item.substance,
      selectedProfile,
    })

    expect(intent.components[0]?.source).toEqual({ type: 'custom_profile', customProfileId: customSubstanceProfile.id })
    expect(intent.components[0]).not.toHaveProperty('substanceId')
    expect(intent.components[0]).not.toHaveProperty('profileId')
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negativa', -1],
    ['zero', 0],
  ])('rejeita halfLifeMs %s na fronteira do Comparator', (_label, halfLifeMs) => {
    expect(() =>
      createComparatorIntent({
        substance: officialSubstance,
        selectedProfile: officialProfile,
        resolvedSelection: resolvedWith({ halfLifeMs }),
      }),
    ).toThrow()
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negativo', -1],
  ])('rejeita tmaxMs %s na fronteira do Protocol', (_label, tmaxMs) => {
    expect(() =>
      createProtocolIntent({
        substance: officialSubstance,
        selectedProfile: officialProfile,
        resolvedSelection: resolvedWith({ tmaxMs }),
      }),
    ).toThrow()
  })

  it.each([null, 0, 12 * 60 * 60 * 1000])('aceita tmaxMs %s quando válido', (tmaxMs) => {
    const intent = createComparatorIntent({
      substance: officialSubstance,
      selectedProfile: officialProfile,
      resolvedSelection: resolvedWith({ tmaxMs }),
    })

    expect(intent.selectedPkParameters.tmaxMs).toBe(tmaxMs)
  })
})
