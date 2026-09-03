import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { OFFICIAL_DATASET_V1 } from '../../../data/substances'
import type { CustomSubstance } from '../../../domain/data-management/types'
import type { BlendSubstance, OfficialDataset, PharmacokineticProfile, SingleSubstance } from '../../../domain/library/types'
import { RangeSelector } from '../../../features/library/components/RangeSelector'
import { SubstanceCard } from '../../../features/library/components/SubstanceCard'
import { SubstanceSheet } from '../../../features/library/components/SubstanceSheet'
import { buildLibraryView } from '../../../features/library/lib/view'

const instantProfile = (
  id: string,
  origin: PharmacokineticProfile['origin'] = { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' },
): PharmacokineticProfile => ({
  id,
  route: 'oral',
  halfLife: { value: 2, unit: 'days' },
  tmaxSpec: { kind: 'instant' },
  origin,
})

const multiProfileSubstance: SingleSubstance = {
  kind: 'single',
  id: 'synthetic-multi-profile',
  slug: 'synthetic-multi-profile',
  name: 'Substância multiperfil',
  aliases: [],
  category: 'other',
  tags: [],
  profiles: [
    instantProfile('legacy', { kind: 'legacy_unattributed', reviewStatus: 'legacy_unreviewed' }),
    instantProfile('literature', { kind: 'literature', reviewStatus: 'reviewed', sourceIds: ['source-1'] }),
    instantProfile('user', { kind: 'user_defined', reviewStatus: 'not_applicable' }),
  ],
}

const legacyOnlySubstance: SingleSubstance = {
  kind: 'single',
  id: 'synthetic-legacy-only',
  slug: 'synthetic-legacy-only',
  name: 'Substância apenas legada',
  aliases: [],
  category: 'other',
  tags: [],
  profiles: [instantProfile('legacy-only')],
}

const literatureBlend: BlendSubstance = {
  kind: 'blend',
  id: 'synthetic-literature-blend',
  slug: 'synthetic-literature-blend',
  name: 'Composição literária',
  aliases: [],
  tags: [],
  origin: { kind: 'literature', reviewStatus: 'reviewed', sourceIds: ['source-1'] },
  components: [],
}

const filterDataset: OfficialDataset = {
  ...OFFICIAL_DATASET_V1,
  substances: [multiProfileSubstance, legacyOnlySubstance, literatureBlend],
}

function singleItem(substance: SingleSubstance): ReturnType<typeof buildLibraryView>[number] {
  return buildLibraryView({ ...OFFICIAL_DATASET_V1, substances: [substance] })[0]
}

describe('E10.2 — filtros e apresentação da Biblioteca', () => {
  it.each([
    ['legacy_unattributed', ['Substância multiperfil', 'Substância apenas legada']],
    ['literature', ['Substância multiperfil', 'Composição literária']],
    ['user_defined', ['Substância multiperfil']],
  ] as const)('filtro %s considera todos os profileViews e a origem do Blend', (filter, expectedNames) => {
    const visible = buildLibraryView( filterDataset, [], [], '', filter)

    expect(visible.map((item) => item.name)).toEqual(expectedNames)
  })

  it.each([
    ['unknown', { kind: 'unknown' }],
    ['instant', { kind: 'instant' }],
    ['value', { kind: 'value', value: { value: 4, unit: 'hours' } }],
    [
      'range',
      {
        kind: 'range',
        range: {
          min: { value: 1, unit: 'hours' },
          max: { value: 3, unit: 'hours' },
        },
      },
    ],
  ] as const)('card diferencia Tmax %s', (kind, tmaxSpec) => {
    const substance: SingleSubstance = {
      ...multiProfileSubstance,
      id: `tmax-${kind}`,
      slug: `tmax-${kind}`,
      name: `Tmax ${kind}`,
      profiles: [{ ...instantProfile(`profile-${kind}`), tmaxSpec }],
    }

    render(<SubstanceCard item={singleItem(substance)} onSelect={() => {}} />)

    const expected = {
      unknown: messages.library.unspecified,
      instant: messages.library.instantaneous,
      value: '4 horas',
      range: messages.library.rangeKind,
    }[kind]

    expect(screen.getByText(expected)).toBeTruthy()
    if (kind === 'unknown') {
      expect(screen.queryByText(messages.library.rangeKind)).toBeNull()
    }
  })

  it('mantém CustomSubstance sem profile visível e desabilita as duas ações com mensagem acessível', () => {
    const customSubstance: CustomSubstance = {
      id: 'custom-without-profile',
      slug: 'custom-without-profile',
      name: 'Substância sem perfil',
      aliases: [],
      category: 'other',
      tags: [],
      createdAt: '2026-09-03T12:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    }
    const item = buildLibraryView(OFFICIAL_DATASET_V1, [customSubstance], []).find(
      (candidate) => candidate.id === customSubstance.id,
    )!
    expect(
      buildLibraryView(OFFICIAL_DATASET_V1, [customSubstance], [], '', 'user_defined').some(
        (candidate) => candidate.id === customSubstance.id,
      ),
    ).toBe(true)

    render(<SubstanceSheet item={item} onClose={() => {}} />)

    expect(screen.getByText('É necessário um perfil farmacocinético para usar esta ação.')).toBeTruthy()
    expect(screen.getByRole('button', { name: messages.library.compare })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: messages.library.addToProtocols })).toHaveProperty('disabled', true)
  })

  it('permite informar Tmax numérico quando o perfil é unknown e preserva o snapshot', () => {
    const substance: SingleSubstance = {
      ...multiProfileSubstance,
      id: 'unknown-tmax-numeric',
      slug: 'unknown-tmax-numeric',
      name: 'Tmax desconhecido numérico',
      profiles: [
        {
          ...instantProfile('unknown-tmax-profile'),
          tmaxSpec: { kind: 'unknown' },
        },
      ],
    }
    const item = singleItem(substance)

    render(<SubstanceSheet item={item} onClose={() => {}} />)

    fireEvent.click(screen.getByLabelText(messages.library.tmaxUnknownProvideValue))
    fireEvent.change(screen.getByRole('textbox', { name: messages.library.tmaxUnknownValueLabel }), {
      target: { value: '12' },
    })
    fireEvent.click(screen.getByRole('button', { name: messages.library.compare }))

    const preview = screen.getByText(/"tmaxMs": 43200000/)
    expect(preview).toBeTruthy()
    expect(screen.getByText(/"value": 12/)).toBeTruthy()
    expect(screen.getByText(/"unit": "hours"/)).toBeTruthy()
  })

  it('apresenta erro de ação pelo catálogo quando a validação interna rejeita o PK', () => {
    const substance: SingleSubstance = {
      ...multiProfileSubstance,
      id: 'invalid-pk-ui',
      slug: 'invalid-pk-ui',
      name: 'Substância com PK inválida',
      profiles: [
        {
          ...instantProfile('invalid-pk-profile'),
          halfLife: { value: Number.NaN, unit: 'days' },
        },
      ],
    }

    render(<SubstanceSheet item={singleItem(substance)} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: messages.library.compare }))

    expect(screen.getByRole('alert').textContent).toContain(messages.library.actionError)
  })

  it('sincroniza RangeSelector com nova faixa e valor sem emitir onChange', () => {
    const onChange = vi.fn()
    const firstRange = {
      min: { value: 1, unit: 'days' as const },
      max: { value: 3, unit: 'days' as const },
    }
    const secondRange = {
      min: { value: 6, unit: 'hours' as const },
      max: { value: 10, unit: 'hours' as const },
    }

    const view = render(
      <RangeSelector
        label="Selecionar faixa"
        range={firstRange}
        value={{ value: 2, unit: 'days' }}
        onChange={onChange}
      />,
    )

    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('2')
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('days')

    view.rerender(
      <RangeSelector label="Selecionar faixa" range={secondRange} value={undefined} onChange={onChange} />,
    )

    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('hours')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('exibe biodisponibilidade em intervalo e mantém o disclaimer educacional', () => {
    const substance: SingleSubstance = {
      ...multiProfileSubstance,
      id: 'bioavailability-range',
      slug: 'bioavailability-range',
      name: 'Biodisponibilidade em faixa',
      profiles: [
        {
          ...instantProfile('bioavailability-profile'),
          bioavailability: { min: 0.6, max: 0.9 },
        },
      ],
    }

    render(<SubstanceSheet item={singleItem(substance)} onClose={() => {}} />)

    expect(screen.getByText('Biodisponibilidade de referência: 60% a 90%')).toBeTruthy()
    expect(screen.getByText(messages.library.bioavailabilityDisclaimer)).toBeTruthy()
  })
})
