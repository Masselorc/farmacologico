import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OFFICIAL_DATASET_V1 } from '../../../data/substances'
import { buildLibraryView } from '../../../features/library/lib/view'
import { createComparatorIntent } from '../../../features/library/lib/intents'
import { SubstanceSheet } from '../../../features/library/components/SubstanceSheet'
import type { SingleSubstance, PharmacokineticProfile } from '../../../domain/library/types'
import type { CustomProfile, CustomSubstance } from '../../../domain/data-management/types'
import { messages } from '../../../app/i18n/pt-BR.messages'

describe('E10.4 — Blocker 1: Identidade canônica official e rejeição de payload trocado', () => {
  const retaItem = buildLibraryView(OFFICIAL_DATASET_V1).find((i) => i.id === 'retatrutida')!
  const retaSub = retaItem.substance as SingleSubstance
  const officialProfile = retaSub.profiles[0]!

  const testoItem = buildLibraryView(OFFICIAL_DATASET_V1).find((i) => i.id === 'testosterona-propionato')!
  const testoSub = testoItem.substance as SingleSubstance
  const testoProfile = testoSub.profiles[0]!

  it('1. Rejeita LibraryProfileView official com payload PK trocado (mesmo com profile.id forjado)', () => {
    // Forja um view official que aponta para Retatrutida, mas carrega o profile da Testosterona
    const forgedProfile: PharmacokineticProfile = {
      ...testoProfile,
      id: officialProfile.id, // 'legacy-v1'
    }

    const forgedView = {
      provenance: 'official' as const,
      substanceId: retaSub.id,
      profileId: officialProfile.id,
      datasetVersion: 1,
      profile: forgedProfile,
    }

    expect(() => {
      createComparatorIntent({
        substance: retaSub,
        substanceProvenance: retaItem.substanceProvenance,
        selectedProfile: forgedView,
      })
    }).toThrow(/diverge|inconsistente|canônic/i)
  })

  it('2. Rejeita perfil official com profileId inexistente na substância', () => {
    const nonexistentView = {
      provenance: 'official' as const,
      substanceId: retaSub.id,
      profileId: 'profile-que-nao-existe',
      datasetVersion: 1,
      profile: officialProfile,
    }

    expect(() => {
      createComparatorIntent({
        substance: retaSub,
        substanceProvenance: retaItem.substanceProvenance,
        selectedProfile: nonexistentView,
      })
    }).toThrow(/não encontrado|inexistente/i)
  })

  it('3. Rejeita CustomProfile onde customProfileId diverge de profile.id', () => {
    const invalidCustomProfile: CustomProfile = {
      id: 'cp-identidade-a',
      owner: { type: 'official', substanceId: 'retatrutida' },
      route: 'subcutaneous',
      halfLife: { value: 5, unit: 'days' },
      tmaxSpec: { kind: 'value', value: { value: 1, unit: 'days' } },
      origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      createdAt: '2026-09-02T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z',
    }

    const forgedCustomView = {
      provenance: 'custom_profile' as const,
      customProfileId: 'cp-identidade-a',
      owner: invalidCustomProfile.owner,
      profile: {
        id: 'cp-identidade-b', // DIVERGE de customProfileId!
        route: invalidCustomProfile.route,
        halfLife: invalidCustomProfile.halfLife,
        tmaxSpec: invalidCustomProfile.tmaxSpec,
        origin: invalidCustomProfile.origin,
      },
    }

    expect(() => {
      createComparatorIntent({
        substance: retaSub,
        substanceProvenance: retaItem.substanceProvenance,
        selectedProfile: forgedCustomView,
      })
    }).toThrow(/diverge|mismatch/i)
  })
})

describe('E10.4 — Blocker 2: Namespace explícito e colisão textual de IDs', () => {
  // Criamos uma substância customizada cujo ID textual é idêntico a uma substância oficial
  const customSubWithOfficialId: CustomSubstance = {
    id: 'retatrutida', // Colisão textual proposital
    slug: 'retatrutida-manipulada',
    name: 'Retatrutida Manipulada',
    aliases: [],
    category: 'other',
    tags: [],
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  }

  const customProfileForCustomSub: CustomProfile = {
    id: 'cp-reta-custom-sub',
    owner: { type: 'custom', substanceId: 'retatrutida' },
    route: 'subcutaneous',
    halfLife: { value: 4, unit: 'days' },
    tmaxSpec: { kind: 'value', value: { value: 1, unit: 'days' } },
    origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  }

  const libraryItems = buildLibraryView(
    OFFICIAL_DATASET_V1,
    [customSubWithOfficialId],
    [customProfileForCustomSub],
  )

  const officialItem = libraryItems.find(
    (i) => i.id === 'retatrutida' && i.substanceProvenance.type === 'official',
  )!
  const customItem = libraryItems.find(
    (i) => i.id === 'retatrutida' && i.substanceProvenance.type === 'custom',
  )!

  it('1. buildLibraryView diferencia explicitamente official e custom mesmo com IDs textuais iguais', () => {
    expect(officialItem).toBeDefined()
    expect(customItem).toBeDefined()
    expect(officialItem.substanceProvenance.type).toBe('official')
    expect(customItem.substanceProvenance.type).toBe('custom')
  })

  it('2. CustomSubstance com ID retatrutida e CustomProfile com owner.type custom NÃO é rejeitada por heurística do dataset', () => {
    const customProfileView = customItem.profileViews[0]!

    // Deve funcionar perfeitamente e produzir source.type = custom_profile
    const intent = createComparatorIntent({
      substance: customItem.substance as SingleSubstance,
      substanceProvenance: customItem.substanceProvenance,
      selectedProfile: customProfileView,
    })

    expect(intent.source.type).toBe('custom_profile')
    expect(intent.name).toBe('Retatrutida Manipulada')
  })

  it('3. CustomSubstance não aceita perfil official mesmo com ID textual coincidente', () => {
    const officialProfileView = officialItem.profileViews[0]!

    expect(() => {
      createComparatorIntent({
        substance: customItem.substance as SingleSubstance,
        substanceProvenance: customItem.substanceProvenance,
        selectedProfile: officialProfileView,
      })
    }).toThrow(/namespace|oficial.*custom|custom.*oficial/i)
  })

  it('4. Official Substance não aceita CustomProfile com owner.type custom mesmo com ID textual coincidente', () => {
    const customProfileView = customItem.profileViews[0]!

    expect(() => {
      createComparatorIntent({
        substance: officialItem.substance as SingleSubstance,
        substanceProvenance: officialItem.substanceProvenance,
        selectedProfile: customProfileView,
      })
    }).toThrow(/namespace|oficial.*custom|custom.*oficial/i)
  })
})

describe('E10.4 — Blocker 3: React key no seletor com colisão textual de profile.id', () => {
  // Custom profile para Retatrutida oficial que intencionalmente usa o ID 'legacy-v1'
  const customProfileLegacyId: CustomProfile = {
    id: 'legacy-v1', // Colisão textual com official profile id
    owner: { type: 'official', substanceId: 'retatrutida' },
    route: 'subcutaneous',
    halfLife: { value: 7, unit: 'days' },
    tmaxSpec: { kind: 'value', value: { value: 3, unit: 'days' } },
    origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  }

  const items = buildLibraryView(OFFICIAL_DATASET_V1, [], [customProfileLegacyId])
  const itemWithCollision = items.find((i) => i.id === 'retatrutida')!

  it('1. Renderização da ficha não gera warning React de duplicate key quando profileId e customProfileId coincidem', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      render(<SubstanceSheet item={itemWithCollision} onClose={() => {}} />)

      // Verifica se houve warning de chave duplicada
      const duplicateKeyCalls = consoleErrorSpy.mock.calls.filter((call) =>
        call.some((arg) => typeof arg === 'string' && arg.includes('Encountered two children with the same key')),
      )
      expect(duplicateKeyCalls).toHaveLength(0)

      // Verifica se ambos os perfis aparecem no dropdown
      const select = screen.getByRole('combobox', { name: /perfil/i })
      expect(select.children).toHaveLength(2)

      // Troca para o segundo perfil (o customizado com mesmo ID 'legacy-v1')
      fireEvent.change(select, { target: { value: '1' } })

      // Badge deve acompanhar a origem do perfil selecionado
      expect(screen.getByText(messages.library.filterUser)).toBeTruthy()
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
