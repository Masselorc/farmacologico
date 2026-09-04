import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { OFFICIAL_DATASET_V1 } from '../../../data/substances'
import { buildLibraryView, libraryItemIdentity } from '../../../features/library/lib/view'
import {
  createComparatorIntent,
  createProtocolIntent,
} from '../../../features/library/lib/intents'
import { LibraryPage } from '../../../features/library/pages/LibraryPage'
import type { SingleSubstance } from '../../../domain/library/types'
import type { CustomProfile, CustomSubstance } from '../../../domain/data-management/types'
import { messages } from '../../../app/i18n/pt-BR.messages'

describe('E10.5 — Blocker 2: datasetVersion das identidades official deve coincidir', () => {
  const retaItem = buildLibraryView(OFFICIAL_DATASET_V1).find((i) => i.id === 'retatrutida')!
  const retaSub = retaItem.substance as SingleSubstance
  const officialProfileView = retaItem.profileViews[0]!

  it('1. Comparator rejeita official quando selectedProfile.datasetVersion diverge de substanceProvenance.datasetVersion', () => {
    const futureProfileView = {
      ...officialProfileView,
      datasetVersion: 999, // Mismatch proposital
    }

    expect(() => {
      createComparatorIntent({
        substance: retaSub,
        substanceProvenance: retaItem.substanceProvenance,
        selectedProfile: futureProfileView,
      })
    }).toThrow(/versão.*dataset|dataset.*version|diverge/i)
  })

  it('2. Protocol Single rejeita official quando selectedProfile.datasetVersion diverge de substanceProvenance.datasetVersion', () => {
    const futureProfileView = {
      ...officialProfileView,
      datasetVersion: 2, // Mismatch proposital
    }

    expect(() => {
      createProtocolIntent({
        substance: retaSub,
        substanceProvenance: retaItem.substanceProvenance,
        selectedProfile: futureProfileView,
      })
    }).toThrow(/versão.*dataset|dataset.*version|diverge/i)
  })

  it('3. Comparator e Protocol aceitam official quando datasetVersion coincide (v1 e v1)', () => {
    const compIntent = createComparatorIntent({
      substance: retaSub,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile: officialProfileView,
    })
    expect(compIntent.source.type).toBe('library')
    if (compIntent.source.type === 'library') {
      expect(compIntent.source.datasetVersion).toBe(1)
    }

    const protoIntent = createProtocolIntent({
      substance: retaSub,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile: officialProfileView,
    })
    expect(protoIntent.components[0]!.source.type).toBe('library')
    if (protoIntent.components[0]!.source.type === 'library') {
      expect(protoIntent.components[0]!.source.datasetVersion).toBe(1)
    }
  })

  it('4. CustomProfile sobre substância official continua funcionando sem datasetVersion no profile', () => {
    const customProfileReta: CustomProfile = {
      id: 'cp-reta-user-v',
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

    const intent = createComparatorIntent({
      substance: retaSub,
      substanceProvenance: retaItem.substanceProvenance,
      selectedProfile: customProfileView,
    })

    expect(intent.source.type).toBe('custom_profile')
  })
})

describe('E10.5 — Blocker 3: libraryItemIdentity e grid sem colisão de chaves React', () => {
  const customSubWithOfficialId: CustomSubstance = {
    id: 'retatrutida', // Colisão textual com official
    slug: 'retatrutida-custom-grid',
    name: 'Retatrutida Custom Grid',
    aliases: [],
    category: 'other',
    tags: [],
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  }

  const customProfileForCustomSub: CustomProfile = {
    id: 'cp-reta-grid',
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

  it('1. libraryItemIdentity gera identidades distintas mesmo quando id textual é igual', () => {
    expect(officialItem.id).toBe(customItem.id)
    const officialIdentity = libraryItemIdentity(officialItem)
    const customIdentity = libraryItemIdentity(customItem)

    expect(officialIdentity).not.toBe(customIdentity)
    expect(officialIdentity).toBe('official:1:retatrutida')
    expect(customIdentity).toBe('custom:retatrutida')
  })

  it('2. LibraryPage renderiza ambos os cards sem duplicate key warning', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await act(async () => {
        render(
          <LibraryPage
            customSubstances={[customSubWithOfficialId]}
            customProfiles={[customProfileForCustomSub]}
          />,
        )
      })

      // Zero duplicate key warnings
      const duplicateKeyCalls = consoleErrorSpy.mock.calls.filter((call) =>
        call.some((arg) => typeof arg === 'string' && arg.includes('Encountered two children with the same key')),
      )
      expect(duplicateKeyCalls).toHaveLength(0)

      // Ambos os cards aparecem no DOM
      expect(screen.getByText('Retatrutida')).toBeTruthy()
      expect(screen.getByText('Retatrutida Custom Grid')).toBeTruthy()
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  it('3. Selecionar cada card abre a entidade correspondente no sheet', async () => {
    await act(async () => {
      render(
        <LibraryPage
          customSubstances={[customSubWithOfficialId]}
          customProfiles={[customProfileForCustomSub]}
        />,
      )
    })

    // Clica no card official
    fireEvent.click(screen.getByText('Retatrutida'))
    const officialDialog = screen.getByRole('dialog')
    expect(officialDialog).toBeTruthy()
    expect(within(officialDialog).getByRole('heading', { name: 'Retatrutida' })).toBeTruthy()

    // Fecha o modal
    fireEvent.click(screen.getByLabelText(messages.library.closeSheet))
    expect(screen.queryByRole('dialog')).toBeNull()

    // Clica no card custom
    fireEvent.click(screen.getByText('Retatrutida Custom Grid'))
    const customDialog = screen.getByRole('dialog')
    expect(customDialog).toBeTruthy()
    expect(within(customDialog).getByRole('heading', { name: 'Retatrutida Custom Grid' })).toBeTruthy()
  })
})
