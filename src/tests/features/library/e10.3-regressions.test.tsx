import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OFFICIAL_DATASET_V1 } from '../../../data/substances'
import { buildLibraryView } from '../../../features/library/lib/view'
import {
  createComparatorIntent,
  createProtocolIntent,
} from '../../../features/library/lib/intents'
import { SubstanceSheet } from '../../../features/library/components/SubstanceSheet'
import { durationValueToMs } from '../../../domain/units/convert'
import type { SelectedPkParameters, PkParametersSnapshot } from '../../../domain/types'
import type { CustomProfile, CustomSubstance } from '../../../domain/data-management/types'
import type { SingleSubstance, BlendSubstance, PharmacokineticProfile } from '../../../domain/library/types'
import { messages } from '../../../app/i18n/pt-BR.messages'

function expectPkSnapshotMatchesSelection(
  selected: SelectedPkParameters,
  snapshot: PkParametersSnapshot,
) {
  expect(durationValueToMs(snapshot.halfLife)).toBe(selected.halfLifeMs)
  if (snapshot.tmax === null) {
    expect(selected.tmaxMs).toBeNull()
  } else {
    expect(durationValueToMs(snapshot.tmax)).toBe(selected.tmaxMs)
  }
}

describe('E10.3 — Blocker 1: Coerência atômica entre SelectedPkParameters e PkParametersSnapshot', () => {
  const retaItem = buildLibraryView(OFFICIAL_DATASET_V1).find((i) => i.id === 'retatrutida')!
  const retaSub = retaItem.substance as SingleSubstance
  const retaProfileView = retaItem.profileViews[0]!

  it('1. Perfil oficial exato deriva PK e snapshot coerentes em uma única operação', () => {
    const intent = createComparatorIntent({
      substance: retaSub,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile: retaProfileView,
    })

    expect(intent.selectedPkParameters.halfLifeMs).toBe(6 * 86400000)
    expect(intent.selectedPkParameters.tmaxMs).toBe(2 * 86400000)
    if (intent.source.type === 'library') {
      expectPkSnapshotMatchesSelection(intent.selectedPkParameters, intent.source.pkParametersSnapshot)
    } else {
      throw new Error('source deve ser library')
    }
  })

  it('2. Perfil com range deriva PK e snapshot coerentes e preserva faixas originais', () => {
    const rangeProfile: PharmacokineticProfile = {
      id: 'profile-range',
      route: 'subcutaneous',
      halfLife: {
        min: { value: 4, unit: 'days' },
        max: { value: 8, unit: 'days' },
      },
      tmaxSpec: {
        kind: 'range',
        range: {
          min: { value: 1, unit: 'days' },
          max: { value: 3, unit: 'days' },
        },
      },
      origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
    }

    const rangeSubstance: SingleSubstance = {
      kind: 'single',
      id: 'substance-range',
      slug: 'substance-range',
      name: 'Substância Range',
      aliases: [],
      category: 'other',
      tags: [],
      profiles: [rangeProfile],
    }

    const rangeProfileView = {
      provenance: 'official' as const,
      substanceId: rangeSubstance.id,
      profileId: rangeProfile.id,
      datasetVersion: 1,
      profile: rangeProfile,
    }

    const intent = createComparatorIntent({
      substance: rangeSubstance,
      substanceProvenance: {
        type: 'official',
        substanceId: rangeSubstance.id,
        datasetVersion: 1,
      },
      selectedProfile: rangeProfileView,
      parameterSelection: {
        chosenHalfLife: { value: 6, unit: 'days' },
        chosenTmax: { value: 2, unit: 'days' },
      },
    })

    expect(intent.selectedPkParameters.halfLifeMs).toBe(6 * 86400000)
    expect(intent.selectedPkParameters.tmaxMs).toBe(2 * 86400000)

    if (intent.source.type === 'library') {
      expectPkSnapshotMatchesSelection(intent.selectedPkParameters, intent.source.pkParametersSnapshot)
      expect(intent.selectedPkParameters.selectionNote?.chosenBy).toBe('user')
      expect(intent.source.pkParametersSnapshot.selectedFromRange).toBeDefined()
    } else {
      throw new Error('source deve ser library')
    }
  })

  it('3. Perfil unknown com escolha instant deriva tmaxMs=null e snapshot.tmax=null', () => {
    const unknownProfile: PharmacokineticProfile = {
      id: 'profile-unknown',
      route: 'subcutaneous',
      halfLife: { value: 5, unit: 'days' },
      tmaxSpec: { kind: 'unknown' },
      origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
    }

    const unknownSubstance: SingleSubstance = {
      kind: 'single',
      id: 'substance-unknown',
      slug: 'substance-unknown',
      name: 'Substância Unknown',
      aliases: [],
      category: 'other',
      tags: [],
      profiles: [unknownProfile],
    }

    const unknownProfileView = {
      provenance: 'official' as const,
      substanceId: unknownSubstance.id,
      profileId: unknownProfile.id,
      datasetVersion: 1,
      profile: unknownProfile,
    }

    const intent = createComparatorIntent({
      substance: unknownSubstance,
      substanceProvenance: {
        type: 'official',
        substanceId: unknownSubstance.id,
        datasetVersion: 1,
      },
      selectedProfile: unknownProfileView,
      parameterSelection: {
        chosenTmax: 'instant',
      },
    })

    expect(intent.selectedPkParameters.tmaxMs).toBeNull()
    if (intent.source.type === 'library') {
      expect(intent.source.pkParametersSnapshot.tmax).toBeNull()
      expectPkSnapshotMatchesSelection(intent.selectedPkParameters, intent.source.pkParametersSnapshot)
    } else {
      throw new Error('source deve ser library')
    }
  })

  it('4. Perfil unknown com escolha numérica deriva tmaxMs correspondente e snapshot.tmax equivalente', () => {
    const unknownProfile: PharmacokineticProfile = {
      id: 'profile-unknown-2',
      route: 'subcutaneous',
      halfLife: { value: 5, unit: 'days' },
      tmaxSpec: { kind: 'unknown' },
      origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
    }

    const unknownSubstance: SingleSubstance = {
      kind: 'single',
      id: 'substance-unknown-2',
      slug: 'substance-unknown-2',
      name: 'Substância Unknown 2',
      aliases: [],
      category: 'other',
      tags: [],
      profiles: [unknownProfile],
    }

    const unknownProfileView = {
      provenance: 'official' as const,
      substanceId: unknownSubstance.id,
      profileId: unknownProfile.id,
      datasetVersion: 1,
      profile: unknownProfile,
    }

    const intent = createComparatorIntent({
      substance: unknownSubstance,
      substanceProvenance: {
        type: 'official',
        substanceId: unknownSubstance.id,
        datasetVersion: 1,
      },
      selectedProfile: unknownProfileView,
      parameterSelection: {
        chosenTmax: { value: 12, unit: 'hours' },
      },
    })

    expect(intent.selectedPkParameters.tmaxMs).toBe(12 * 3600000)
    if (intent.source.type === 'library') {
      expect(intent.source.pkParametersSnapshot.tmax).toEqual({ value: 12, unit: 'hours' })
      expectPkSnapshotMatchesSelection(intent.selectedPkParameters, intent.source.pkParametersSnapshot)
    } else {
      throw new Error('source deve ser library')
    }
  })
})

describe('E10.3 — Blocker 2: Pertencimento e invariante de identidade (Cross-Substance Rejection)', () => {
  const retaItem = buildLibraryView(OFFICIAL_DATASET_V1).find((i) => i.id === 'retatrutida')!
  const retaSub = retaItem.substance as SingleSubstance

  const enantatoItem = buildLibraryView(OFFICIAL_DATASET_V1).find((i) => i.id === 'testosterona-enantato')!
  const enantatoSub = enantatoItem.substance as SingleSubstance
  const enantatoProfileView = enantatoItem.profileViews[0]!

  it('1. Rejeita perfil oficial de outra substância (Official mismatch)', () => {
    expect(() => {
      createComparatorIntent({
        substance: retaSub,
        substanceProvenance: retaItem.substanceProvenance,
        selectedProfile: enantatoProfileView,
      })
    }).toThrow(/pertence|mismatch/i)

    expect(() => {
      createProtocolIntent({
        substance: retaSub,
        substanceProvenance: retaItem.substanceProvenance,
        selectedProfile: enantatoProfileView,
      })
    }).toThrow(/pertence|mismatch/i)
  })

  it('2. Rejeita custom profile com owner.type official de substância A usado com substância B', () => {
    const customProfileReta: CustomProfile = {
      id: 'cp-reta-user',
      owner: { type: 'official', substanceId: 'retatrutida' },
      route: 'subcutaneous',
      halfLife: { value: 5, unit: 'days' },
      tmaxSpec: { kind: 'value', value: { value: 1, unit: 'days' } },
      origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      createdAt: '2026-09-02T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z',
    }

    const retaWithCustom = buildLibraryView(OFFICIAL_DATASET_V1, [], [customProfileReta]).find((i) => i.id === 'retatrutida')!
    const customProfileView = retaWithCustom.profileViews.find((pv) => pv.provenance === 'custom_profile')!

    expect(() => {
      createComparatorIntent({
        substance: enantatoSub,
        substanceProvenance: enantatoItem.substanceProvenance,
        selectedProfile: customProfileView,
      })
    }).toThrow(/pertence|mismatch/i)
  })

  it('3. Rejeita custom profile com owner.type custom de substância A usado com substância B', () => {
    const customSubA: CustomSubstance = {
      id: 'custom-sub-a',
      slug: 'custom-sub-a',
      name: 'Substância A',
      aliases: [],
      category: 'other',
      tags: [],
      createdAt: '2026-09-02T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z',
    }
    const customProfileA: CustomProfile = {
      id: 'cp-sub-a',
      owner: { type: 'custom', substanceId: 'custom-sub-a' },
      route: 'oral',
      halfLife: { value: 6, unit: 'hours' },
      tmaxSpec: { kind: 'instant' },
      origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      createdAt: '2026-09-02T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z',
    }

    const items = buildLibraryView(OFFICIAL_DATASET_V1, [customSubA], [customProfileA])
    const itemA = items.find((i) => i.id === 'custom-sub-a')!
    const profileViewA = itemA.profileViews[0]!

    expect(() => {
      createComparatorIntent({
        substance: retaSub,
        substanceProvenance: retaItem.substanceProvenance,
        selectedProfile: profileViewA,
      })
    }).toThrow(/pertence|mismatch|associado/i)
  })

  it('4. Happy paths mantêm sucesso quando substância e perfil correspondem exatamente', () => {
    // Official + Official
    const comp1 = createComparatorIntent({
      substance: retaSub,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile: retaItem.profileViews[0]!,
    })
    expect(comp1.source.type).toBe('library')

    // Official + Custom Profile
    const customProfileReta: CustomProfile = {
      id: 'cp-reta-user',
      owner: { type: 'official', substanceId: 'retatrutida' },
      route: 'subcutaneous',
      halfLife: { value: 5, unit: 'days' },
      tmaxSpec: { kind: 'value', value: { value: 1, unit: 'days' } },
      origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      createdAt: '2026-09-02T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z',
    }
    const retaWithCustom = buildLibraryView(OFFICIAL_DATASET_V1, [], [customProfileReta]).find((i) => i.id === 'retatrutida')!
    const customProfileView = retaWithCustom.profileViews.find((pv) => pv.provenance === 'custom_profile')!
    const comp2 = createComparatorIntent({
      substance: retaSub,
      substanceProvenance: retaWithCustom.substanceProvenance,
      selectedProfile: customProfileView,
    })
    expect(comp2.source.type).toBe('custom_profile')
  })
})

describe('E10.3 — Blocker 3: RangeSelector e isolamento entre perfis com faixas idênticas', () => {
  const profileRangeA: PharmacokineticProfile = {
    id: 'profile-a',
    route: 'subcutaneous',
    formulation: 'Perfil A',
    halfLife: {
      min: { value: 1, unit: 'days' },
      max: { value: 3, unit: 'days' },
    },
    tmaxSpec: {
      kind: 'range',
      range: {
        min: { value: 1, unit: 'days' },
        max: { value: 3, unit: 'days' },
      },
    },
    origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
  }

  const profileRangeB: PharmacokineticProfile = {
    id: 'profile-b',
    route: 'subcutaneous',
    formulation: 'Perfil B',
    halfLife: {
      min: { value: 1, unit: 'days' },
      max: { value: 3, unit: 'days' },
    },
    tmaxSpec: {
      kind: 'range',
      range: {
        min: { value: 1, unit: 'days' },
        max: { value: 3, unit: 'days' },
      },
    },
    origin: { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
  }

  const multiRangeSubstance: SingleSubstance = {
    kind: 'single',
    id: 'substance-multi-range',
    slug: 'substance-multi-range',
    name: 'Substância Multi Range',
    aliases: [],
    category: 'other',
    tags: [],
    profiles: [profileRangeA, profileRangeB],
  }

  const multiRangeItem = buildLibraryView({
    ...OFFICIAL_DATASET_V1,
    substances: [multiRangeSubstance],
  })[0]!

  it('1. Troca entre perfis com half-life range idêntico reseta o input visual e impede reutilização de seleção', () => {
    render(<SubstanceSheet item={multiRangeItem} onClose={() => {}} />)

    // No Perfil A (índice 0): preenche input de meia-vida
    const halfLifeInputs = screen.getAllByRole('textbox')
    const hlInput = halfLifeInputs[0]!
    fireEvent.change(hlInput, { target: { value: '2' } })
    expect((hlInput as HTMLInputElement).value).toBe('2')

    // Troca para o Perfil B (índice 1) no select de perfis
    const profileSelect = screen.getByRole('combobox', { name: /perfil/i })
    fireEvent.change(profileSelect, { target: { value: '1' } })

    // No Perfil B: o input de meia-vida deve estar VAZIO
    const newHalfLifeInputs = screen.getAllByRole('textbox')
    const newHlInput = newHalfLifeInputs[0]!
    expect((newHlInput as HTMLInputElement).value).toBe('')

    // Clicar em Comparar deve falhar pois a seleção está incompleta
    fireEvent.click(screen.getByRole('button', { name: messages.library.compare }))
    expect(screen.queryByText(/prepared-intent/i)).toBeNull()
  })

  it('2. Troca entre perfis com Tmax range idêntico reseta o input visual', () => {
    render(<SubstanceSheet item={multiRangeItem} onClose={() => {}} />)

    // Preenche input de Tmax no Perfil A (índice 0)
    const inputs = screen.getAllByRole('textbox')
    const tmaxInput = inputs[1]!
    fireEvent.change(tmaxInput, { target: { value: '2' } })
    expect((tmaxInput as HTMLInputElement).value).toBe('2')

    // Troca para o Perfil B (índice 1)
    const profileSelect = screen.getByRole('combobox', { name: /perfil/i })
    fireEvent.change(profileSelect, { target: { value: '1' } })

    // No Perfil B: o input de Tmax deve estar VAZIO
    const newInputs = screen.getAllByRole('textbox')
    const newTmaxInput = newInputs[1]!
    expect((newTmaxInput as HTMLInputElement).value).toBe('')
  })

  it('3. preparedIntent é resetado ao trocar de perfil mesmo se ranges forem idênticos', () => {
    render(<SubstanceSheet item={multiRangeItem} onClose={() => {}} />)

    // Preenche ambos os ranges no Perfil A
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0]!, { target: { value: '2' } })
    fireEvent.blur(inputs[0]!)
    fireEvent.change(inputs[1]!, { target: { value: '2' } })
    fireEvent.blur(inputs[1]!)

    // Clica em Comparar
    fireEvent.click(screen.getByRole('button', { name: messages.library.compare }))
    expect(screen.getByText(/"name": "Substância Multi Range"/)).toBeTruthy()

    // Troca para Perfil B
    const profileSelect2 = screen.getByRole('combobox', { name: /perfil/i })
    fireEvent.change(profileSelect2, { target: { value: '1' } })

    // O intent preparado não deve mais ser exibido
    expect(screen.queryByText(/"name": "Substância Multi Range"/)).toBeNull()
  })
})

describe('E10.3 — Regressão Blend: Não regressão do comportamento de composição', () => {
  it('BlendSubstance continua produzindo 3 componentes com proporções 0.2/0.4/0.4 sem doses', () => {
    const durateston = OFFICIAL_DATASET_V1.substances.find((s) => s.id === 'durateston-landergold') as BlendSubstance
    const intent = createProtocolIntent({
      substance: durateston,
      dataset: OFFICIAL_DATASET_V1,
    })

    expect(intent.components).toHaveLength(3)
    expect(intent.components[0]!.proportion).toBe(0.2)
    expect(intent.components[1]!.proportion).toBe(0.4)
    expect(intent.components[2]!.proportion).toBe(0.4)
    expect('doses' in intent).toBe(false)
    expect('amountMg' in intent).toBe(false)
    expect('totalDoseMg' in intent).toBe(false)
  })
})
