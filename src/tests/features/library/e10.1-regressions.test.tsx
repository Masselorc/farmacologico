import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  profileOriginSchema,
  sourceSchema,
  pharmacokineticProfileSchema,
  singleSubstanceSchema,
  blendComponentSchema,
  blendSubstanceSchema,
  datasetMetadataSchema,
} from '../../../validation/schemas/library'
import { createOfficialEntityResolver } from '../../../data/substances/resolver'
import { validateOfficialDataset } from '../../../data/substances/validate'
import { OFFICIAL_DATASET_V1, LEGACY_SUBSTANCES } from '../../../data/substances'
import { resolveProfileParameters } from '../../../features/library/lib/selection'
import {
  createComparatorIntent,
  createProtocolIntent,
} from '../../../features/library/lib/intents'
import { buildLibraryView } from '../../../features/library/lib/view'
import { RangeSelector } from '../../../features/library/components/RangeSelector'
import { SubstanceSheet } from '../../../features/library/components/SubstanceSheet'
import type { CustomProfile, CustomSubstance } from '../../../domain/data-management/types'
import type { OfficialDataset, SingleSubstance } from '../../../domain/library/types'
import type { LibraryProfileView } from '../../../features/library/lib/view'

describe('E10.1 — Blocker 9: Schemas strict da Biblioteca', () => {
  it('profileOriginSchema deve rejeitar propriedades desconhecidas em todos os variantes', () => {
    // user_defined com campo extra
    expect(
      profileOriginSchema.safeParse({
        kind: 'user_defined',
        reviewStatus: 'not_applicable',
        sourceIds: ['fake'],
      }).success,
    ).toBe(false)

    // legacy_unattributed com campo extra
    expect(
      profileOriginSchema.safeParse({
        kind: 'legacy_unattributed',
        reviewStatus: 'legacy_unreviewed',
        extraField: 123,
      }).success,
    ).toBe(false)

    // literature com campo extra
    expect(
      profileOriginSchema.safeParse({
        kind: 'literature',
        reviewStatus: 'reviewed',
        sourceIds: ['src-1'],
        unknownProp: true,
      }).success,
    ).toBe(false)
  })

  it('sourceSchema deve rejeitar campos desconhecidos', () => {
    expect(
      sourceSchema.safeParse({
        id: 'src-1',
        title: 'Estudo Teste',
        extraField: 'não permitido',
      }).success,
    ).toBe(false)
  })

  it('pharmacokineticProfileSchema deve rejeitar campos desconhecidos', () => {
    expect(
      pharmacokineticProfileSchema.safeParse({
        id: 'prof-1',
        route: 'intramuscular',
        halfLife: { value: 6, unit: 'days' },
        tmaxSpec: { kind: 'instant' },
        origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
        unauthorizedProperty: 42,
      }).success,
    ).toBe(false)
  })

  it('singleSubstanceSchema deve rejeitar campos desconhecidos', () => {
    expect(
      singleSubstanceSchema.safeParse({
        kind: 'single',
        id: 'test-sub',
        slug: 'test-sub',
        name: 'Test Sub',
        aliases: [],
        category: 'other',
        tags: [],
        profiles: [
          {
            id: 'prof-1',
            route: 'oral',
            halfLife: { value: 1, unit: 'days' },
            tmaxSpec: { kind: 'instant' },
            origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
          },
        ],
        extraField: 'proibido',
      }).success,
    ).toBe(false)
  })

  it('blendComponentSchema e blendSubstanceSchema devem rejeitar campos desconhecidos', () => {
    expect(
      blendComponentSchema.safeParse({
        substanceId: 'sub-1',
        profileId: 'prof-1',
        proportion: 1,
        randomKey: 'fail',
      }).success,
    ).toBe(false)

    expect(
      blendSubstanceSchema.safeParse({
        kind: 'blend',
        id: 'blend-1',
        slug: 'blend-1',
        name: 'Blend Teste',
        aliases: [],
        tags: [],
        origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
        components: [
          {
            substanceId: 'sub-1',
            profileId: 'prof-1',
            proportion: 1,
          },
        ],
        unexpected: 'error',
      }).success,
    ).toBe(false)
  })

  it('datasetMetadataSchema deve ser strict', () => {
    expect(
      datasetMetadataSchema.safeParse({
        datasetVersion: 1,
        updatedAt: '2026-09-02T00:00:00.000Z',
        substanceCount: 0,
        extraMeta: 'bad',
      }).success,
    ).toBe(false)
  })
})

describe('E10.1 — Blocker 10: Paleta autorizada fechada para BlendComponent', () => {
  it('blendComponentSchema aceita cor da paleta permitida PALETTE_ALLOWED', () => {
    const valid = blendComponentSchema.safeParse({
      substanceId: 'sub-1',
      profileId: 'prof-1',
      proportion: 1,
      displayColor: { paletteColor: '#2563eb' },
    })
    expect(valid.success).toBe(true)
  })

  it('blendComponentSchema rejeita cores arbitrárias não autorizadas (#123456, red, etc.)', () => {
    const invalidHex = blendComponentSchema.safeParse({
      substanceId: 'sub-1',
      profileId: 'prof-1',
      proportion: 1,
      displayColor: { paletteColor: '#123456' },
    })
    expect(invalidHex.success).toBe(false)

    const invalidName = blendComponentSchema.safeParse({
      substanceId: 'sub-1',
      profileId: 'prof-1',
      proportion: 1,
      displayColor: { paletteColor: 'red' },
    })
    expect(invalidName.success).toBe(false)
  })
})

describe('E10.1 — Blocker 11: Resolver deve rejeitar datasetVersion futuro PRIMEIRO', () => {
  it('rejeita imediatamente datasetVersion > currentVersion antes de qualquer resolução de ID', () => {
    const resolver = createOfficialEntityResolver(OFFICIAL_DATASET_V1)

    // No dataset v1, 'retatrutida' e 'legacy-v1' existem, mas com version 999 devem ser rejeitados!
    expect(resolver.hasSubstance('retatrutida', 999)).toBe(false)
    expect(resolver.hasSingleSubstance('retatrutida', 999)).toBe(false)
    expect(resolver.hasProfile('retatrutida', 'legacy-v1', 999)).toBe(false)
    expect(resolver.resolveSubstance('retatrutida', 999)).toBeUndefined()
    expect(resolver.resolveProfile('retatrutida', 'legacy-v1', 999)).toBeUndefined()
  })
})

describe('E10.1 — Blocker 3: Tmax range NÃO pode virar instant', () => {
  const profileWithTmaxRange = {
    id: 'prof-range',
    route: 'intramuscular' as const,
    halfLife: { value: 6, unit: 'days' as const },
    tmaxSpec: {
      kind: 'range' as const,
      range: {
        min: { value: 24, unit: 'hours' as const },
        max: { value: 72, unit: 'hours' as const },
      },
    },
    origin: { kind: 'user_defined' as const, reviewStatus: 'not_applicable' as const },
  }

  it('lança erro se chosenTmax for instant para tmaxSpec.kind === range', () => {
    expect(() =>
      resolveProfileParameters(profileWithTmaxRange, {
        chosenTmax: 'instant',
      }),
    ).toThrow()
  })

  it('aceita escolha DurationValue equivalente em outra unidade dentro da faixa normalizada', () => {
    // 2 days = 48 hours, está entre 24h e 72h
    const res = resolveProfileParameters(profileWithTmaxRange, {
      chosenTmax: { value: 2, unit: 'days' },
    })
    expect(res.needsUserSelection).toBe(false)
    expect(res.selectedPkParameters.tmaxMs).toBe(2 * 86_400_000)
  })

  it('lança erro para valores abaixo do mínimo ou acima do máximo', () => {
    expect(() =>
      resolveProfileParameters(profileWithTmaxRange, {
        chosenTmax: { value: 12, unit: 'hours' },
      }),
    ).toThrow()

    expect(() =>
      resolveProfileParameters(profileWithTmaxRange, {
        chosenTmax: { value: 80, unit: 'hours' },
      }),
    ).toThrow()
  })
})

describe('E10.1 — Blocker 4: Builders não podem gerar intent com seleção incompleta', () => {
  const rangeSubstance: SingleSubstance = {
    kind: 'single',
    id: 'test-range-sub',
    slug: 'test-range-sub',
    name: 'Substância Faixa',
    aliases: [],
    category: 'other',
    tags: [],
    profiles: [
      {
        id: 'prof-hl-range',
        route: 'oral',
        halfLife: {
          min: { value: 2, unit: 'days' },
          max: { value: 5, unit: 'days' },
        },
        tmaxSpec: { kind: 'instant' },
        origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      },
    ],
  }

  it('createComparatorIntent lança erro semântico quando halfLife é range e não foi escolhida', () => {
    const selectedProfile: LibraryProfileView = {
      provenance: 'custom_profile',
      customProfileId: 'cp-range',
      owner: { type: 'custom', substanceId: rangeSubstance.id },
      profile: rangeSubstance.profiles[0]!,
    }

    expect(() =>
      createComparatorIntent({
        substance: rangeSubstance,
        substanceProvenance: { type: 'custom', customSubstanceId: rangeSubstance.id },
        selectedProfile,
      }),
    ).toThrow()
  })

  it('createProtocolIntent lança erro semântico quando halfLife é range e não foi escolhida', () => {
    const selectedProfile: LibraryProfileView = {
      provenance: 'custom_profile',
      customProfileId: 'cp-range',
      owner: { type: 'custom', substanceId: rangeSubstance.id },
      profile: rangeSubstance.profiles[0]!,
    }

    expect(() =>
      createProtocolIntent({
        substance: rangeSubstance,
        substanceProvenance: { type: 'custom', customSubstanceId: rangeSubstance.id },
        selectedProfile,
      }),
    ).toThrow()
  })
})

describe('E10.1 — Blocker 6: Snapshot do Blend fora da source do componente', () => {
  it('no LibraryProtocolIntent de Blend, pkParametersSnapshot fica no componente e NÃO dentro de source', () => {
    const blendSub = OFFICIAL_DATASET_V1.substances.find((s) => s.id === 'durateston-landergold')!
    if (blendSub.kind !== 'blend') throw new Error('Fixture Durateston inválida')
    const intent = createProtocolIntent({
      substance: blendSub,
      dataset: OFFICIAL_DATASET_V1,
    })

    expect(intent.components).toHaveLength(3)
    for (const comp of intent.components) {
      expect(comp.source.type).toBe('library')
      // NÃO pode ter pkParametersSnapshot dentro de source
      expect('pkParametersSnapshot' in comp.source).toBe(false)
      // DEVE estar na raiz do componente
      expect(comp.pkParametersSnapshot).toBeDefined()
      expect(comp.selectedPkParameters).toBeDefined()
    }
  })
})

describe('E10.1 — Blocker 8: RangeSelector invalida parent ao editar valor válido para inválido', () => {
  it('chama onChange(undefined) imediatamente quando o texto se torna inválido', () => {
    const onChange = vi.fn()
    const range = {
      min: { value: 1, unit: 'days' as const },
      max: { value: 3, unit: 'days' as const },
    }

    render(
      <RangeSelector
        label="Selecionar Meia-vida"
        range={range}
        value={{ value: 2, unit: 'days' }}
        onChange={onChange}
      />,
    )

    const input = screen.getByRole('textbox')
    expect((input as HTMLInputElement).value).toBe('2')

    // Usuário digita '4' (fora do intervalo 1..3)
    fireEvent.change(input, { target: { value: '4' } })

    // O pai NÃO pode continuar com valor 2 antigo; deve receber undefined!
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})

describe('E10.1 — Blocker 12: Validação semântica de Source.id único', () => {
  it('validateOfficialDataset rejeita dataset com IDs duplicados em sources', () => {
    const datasetWithDuplicateSource: OfficialDataset = {
      ...OFFICIAL_DATASET_V1,
      sources: [
        { id: 'src-1', title: 'Fonte 1' },
        { id: 'src-1', title: 'Fonte 2 duplicada' },
      ],
    }
    const res = validateOfficialDataset(datasetWithDuplicateSource)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.includes('ID duplicado em sources'))).toBe(true)
  })
})

describe('E10.1 — Blocker 15: Categorias conservadoras no golden dataset', () => {
  it('todas as substâncias do dataset oficial possuem category "other" por decisão conservadora normativa', () => {
    for (const sub of LEGACY_SUBSTANCES) {
      if (sub.kind === 'single') {
        expect(sub.category).toBe('other')
      }
    }
  })
})

describe('E10.1 — Blocker 1 & 16: Proveniência de CustomProfile e tipagem estrita de intents', () => {
  const customProfile: CustomProfile = {
    id: 'cp-retatrutida-user',
    owner: { type: 'official', substanceId: 'retatrutida' },
    route: 'subcutaneous',
    halfLife: { value: 5, unit: 'days' },
    tmaxSpec: { kind: 'value', value: { value: 1, unit: 'days' } },
    origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  }

  const customSubstance: CustomSubstance = {
    id: 'custom-sub-1',
    slug: 'custom-sub-1',
    name: 'Minha Substância',
    aliases: [],
    category: 'other',
    tags: [],
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  }

  const customProfile2: CustomProfile = {
    id: 'cp-sub1',
    owner: { type: 'custom', substanceId: 'custom-sub-1' },
    route: 'oral',
    halfLife: { value: 12, unit: 'hours' },
    tmaxSpec: { kind: 'instant' },
    origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  }

  it('A. Official Substance + Official Profile gera source.type === library com ID oficial e datasetVersion', () => {
    const items = buildLibraryView(OFFICIAL_DATASET_V1)
    const retaItem = items.find((i) => i.id === 'retatrutida')!
    if (retaItem.substance.kind !== 'single') throw new Error('Fixture Retatrutida inválida')
    const officialProfileView = retaItem.profileViews[0]!

    const intent = createComparatorIntent({
      substance: retaItem.substance,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile: officialProfileView,
    })

    expect(intent.source.type).toBe('library')
    if (intent.source.type === 'library') {
      expect(intent.source.substanceId).toBe('retatrutida')
      expect(intent.source.profileId).toBe('legacy-v1')
      expect(intent.source.datasetVersion).toBe(1)
    }
  })

  it('B. Official Substance + CustomProfile gera source.type === custom_profile com customProfileId preservado', () => {
    const items = buildLibraryView(OFFICIAL_DATASET_V1, [], [customProfile])
    const retaItem = items.find((i) => i.id === 'retatrutida')!
    if (retaItem.substance.kind !== 'single') throw new Error('Fixture Retatrutida inválida')
    expect(retaItem.profileViews.length).toBe(2)

    const userProfileView = retaItem.profileViews.find((pv) => pv.provenance === 'custom_profile')!
    expect(userProfileView).toBeDefined()

    const compIntent = createComparatorIntent({
      substance: retaItem.substance,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile: userProfileView,
    })

    expect(compIntent.source.type).toBe('custom_profile')
    if (compIntent.source.type === 'custom_profile') {
      expect(compIntent.source.customProfileId).toBe('cp-retatrutida-user')
      expect('profileId' in compIntent.source).toBe(false)
      expect('substanceId' in compIntent.source).toBe(false)
    }

    const protoIntent = createProtocolIntent({
      substance: retaItem.substance,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile: userProfileView,
    })

    expect(protoIntent.components[0].source.type).toBe('custom_profile')
    if (protoIntent.components[0].source.type === 'custom_profile') {
      expect(protoIntent.components[0].source.customProfileId).toBe('cp-retatrutida-user')
    }
  })

  it('C. CustomSubstance + CustomProfile gera source.type === custom_profile', () => {
    const items = buildLibraryView(OFFICIAL_DATASET_V1, [customSubstance], [customProfile2])
    const customItem = items.find((i) => i.id === 'custom-sub-1')!
    if (customItem.substance.kind !== 'single') throw new Error('Fixture custom inválida')
    const pv = customItem.profileViews[0]!

    const compIntent = createComparatorIntent({
      substance: customItem.substance,
      substanceProvenance: customItem.substanceProvenance,
      selectedProfile: pv,
    })
    expect(compIntent.source.type).toBe('custom_profile')
  })

  it('D. CustomProfile nunca é resolvido pelo OfficialEntityResolver', () => {
    const resolver = createOfficialEntityResolver(OFFICIAL_DATASET_V1)
    expect(resolver.hasProfile('retatrutida', 'cp-retatrutida-user', 1)).toBe(false)
  })
})

describe('E10.1 — Blocker 2: Badge de origem acompanha o perfil selecionado', () => {
  const customProfile: CustomProfile = {
    id: 'cp-reta-user',
    owner: { type: 'official', substanceId: 'retatrutida' },
    route: 'subcutaneous',
    halfLife: { value: 5, unit: 'days' },
    tmaxSpec: { kind: 'value', value: { value: 1, unit: 'days' } },
    origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  }

  it('ao trocar para perfil de usuário, badge exibe "Criado por você"', () => {
    const items = buildLibraryView(OFFICIAL_DATASET_V1, [], [customProfile])
    const retaItem = items.find((i) => i.id === 'retatrutida')!

    render(<SubstanceSheet item={retaItem} onClose={() => {}} />)

    // Inicialmente perfil 0 (oficial legacy_unattributed)
    expect(screen.getByText('Legado sem fonte')).toBeDefined()

    // Seleciona perfil do usuário no select
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '1' } })

    // O badge deve atualizar para "Criado por você"
    expect(screen.getByText('Criado por você')).toBeDefined()
  })
})

describe('E10.1 — Blocker 7: Tmax unknown possui controles para valor e instantâneo', () => {
  const unknownTmaxSub: SingleSubstance = {
    kind: 'single',
    id: 'sub-unknown-tmax',
    slug: 'sub-unknown-tmax',
    name: 'Substância Sem Tmax',
    aliases: [],
    category: 'other',
    tags: [],
    profiles: [
      {
        id: 'prof-unknown',
        route: 'oral',
        halfLife: { value: 4, unit: 'hours' },
        tmaxSpec: { kind: 'unknown' },
        origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      },
    ],
  }

  it('permite escolher absorção instantânea e gerar intent válido', () => {
    const items = buildLibraryView({
      ...OFFICIAL_DATASET_V1,
      substances: [unknownTmaxSub],
    })
    const item = items[0]

    render(<SubstanceSheet item={item} onClose={() => {}} />)

    // Clicar em Comparar antes de escolher Tmax deve bloquear com alerta inline
    const compareBtn = screen.getByRole('button', { name: /Comparar no Meia-vida/i })
    fireEvent.click(compareBtn)

    const alertBox = screen.getByRole('alert')
    expect(alertBox.textContent).toContain('Selecione os parâmetros obrigatórios antes de prosseguir')

    // Seleciona opção instantânea
    const radioInstant = screen.getByLabelText(/Absorção instantânea/i)
    fireEvent.click(radioInstant)

    // Agora clica em Comparar com sucesso
    fireEvent.click(compareBtn)
    expect(screen.getByText(/Ação preparada/i)).toBeDefined()
  })
})

describe('E10.1 — Blocker 13: Biodisponibilidade de referência exibida quando presente', () => {
  const bioSub: SingleSubstance = {
    kind: 'single',
    id: 'sub-with-bio',
    slug: 'sub-with-bio',
    name: 'Substância Biodisponível',
    aliases: [],
    category: 'other',
    tags: [],
    profiles: [
      {
        id: 'prof-bio',
        route: 'oral',
        halfLife: { value: 8, unit: 'hours' },
        tmaxSpec: { kind: 'instant' },
        bioavailability: 0.85,
        origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      },
    ],
  }

  it('exibe valor numérico de biodisponibilidade de referência', () => {
    const items = buildLibraryView({
      ...OFFICIAL_DATASET_V1,
      substances: [bioSub],
    })
    const item = items[0]

    render(<SubstanceSheet item={item} onClose={() => {}} />)

    expect(screen.getByText(/Biodisponibilidade de referência: 85%/i)).toBeDefined()
  })
})

describe('E10.1 — Proibição de doses automáticas em intents', () => {
  it('nenhum intent de comparador ou protocolo possui doses preenchidas', () => {
    const retaSub = OFFICIAL_DATASET_V1.substances.find((s) => s.id === 'retatrutida')!
    if (retaSub.kind !== 'single') throw new Error('Fixture Retatrutida inválida')
    const retaItem = buildLibraryView(OFFICIAL_DATASET_V1).find((item) => item.id === retaSub.id)!
    const selectedProfile = retaItem.profileViews[0]!
    const compIntent = createComparatorIntent({
      substance: retaSub,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile,
    })
    expect('doses' in compIntent).toBe(false)
    expect('amountMg' in compIntent).toBe(false)

    const protoIntent = createProtocolIntent({
      substance: retaSub,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile,
    })
    for (const comp of protoIntent.components) {
      expect('doses' in comp).toBe(false)
      expect('amountMg' in comp).toBe(false)
      expect('schedule' in comp).toBe(false)
    }
  })
})
