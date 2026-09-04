import type { CustomProfile, CustomProfileOwner, CustomSubstance } from '../../../domain/data-management/types'
import type { OfficialDataset, PharmacokineticProfile, SingleSubstance, Substance } from '../../../domain/library/types'
import type { PaletteColorId } from '../../../domain/shared/colors'
import type { ProfileOrigin } from '../../../domain/types'
import { LEGACY_SUBSTANCE_COLORS } from '../../../data/substances/legacy.dataset'

export type OriginFilterKind = 'all' | 'legacy_unattributed' | 'literature' | 'user_defined'

export type LibraryProfileView =
  | {
      provenance: 'official'
      substanceId: string
      profileId: string
      datasetVersion: number
      profile: PharmacokineticProfile
    }
  | {
      provenance: 'custom_profile'
      customProfileId: string
      owner: CustomProfileOwner
      profile: PharmacokineticProfile
    }

/**
 * Constrói uma chave de identidade determinística para o LibraryProfileView.
 */
export function profileViewIdentity(view: LibraryProfileView): string {
  if (view.provenance === 'official') {
    return `official:${view.substanceId}:${view.profileId}:${view.datasetVersion}`
  }
  return `custom:${view.customProfileId}`
}

export type LibrarySubstanceProvenance =
  | {
      type: 'official'
      substanceId: string
      datasetVersion: number
    }
  | {
      type: 'custom'
      customSubstanceId: string
    }

/**
 * Constrói uma chave de identidade determinística para o LibraryItemView (§6, §9, E10.5).
 */
export function libraryItemIdentity(
  item: Pick<LibraryItemView, 'substanceProvenance'>,
): string {
  if (item.substanceProvenance.type === 'official') {
    return `official:${item.substanceProvenance.datasetVersion}:${item.substanceProvenance.substanceId}`
  }
  return `custom:${item.substanceProvenance.customSubstanceId}`
}

export interface LibraryItemView {
  id: string
  slug: string
  name: string
  aliases: string[]
  tags: string[]
  category: string
  kind: 'single' | 'blend'
  substance: Substance
  profiles: PharmacokineticProfile[]
  profileViews: LibraryProfileView[]
  origin: ProfileOrigin
  color: PaletteColorId
  componentOnly: boolean
  deprecated: boolean
  substanceProvenance: LibrarySubstanceProvenance
}

function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Constrói a VIEW agregada em memória da Biblioteca (§6, §9).
 * Agrega o dataset oficial e as customSubstances + customProfiles do usuário.
 */
export function buildLibraryView(
  officialDataset: OfficialDataset,
  customSubstances: CustomSubstance[] = [],
  customProfiles: CustomProfile[] = [],
  searchQuery = '',
  originFilter: OriginFilterKind = 'all',
): LibraryItemView[] {
  const items: LibraryItemView[] = []

  // 1. Entidades oficiais
  for (const s of officialDataset.substances) {
    const isComponentOnly = s.kind === 'single' && s.componentOnly === true
    const isDeprecated = s.deprecated === true

    const profileViews: LibraryProfileView[] = []

    if (s.kind === 'single') {
      // Perfis oficiais da substância
      for (const p of s.profiles) {
        profileViews.push({
          provenance: 'official',
          substanceId: s.id,
          profileId: p.id,
          datasetVersion: officialDataset.metadata.datasetVersion,
          profile: p,
        })
      }

      // Adiciona perfis customizados vinculados a esta substância oficial
      const userProfiles = customProfiles.filter(
        (cp) => cp.owner.type === 'official' && cp.owner.substanceId === s.id,
      )
      for (const up of userProfiles) {
        profileViews.push({
          provenance: 'custom_profile',
          customProfileId: up.id,
          owner: up.owner,
          profile: {
            id: up.id,
            route: up.route,
            formulation: up.formulation,
            ester: up.ester,
            halfLife: up.halfLife,
            tmaxSpec: up.tmaxSpec,
            bioavailability: up.bioavailability,
            populationContext: up.populationContext,
            origin: up.origin,
          },
        })
      }
    }

    const profiles = profileViews.map((pv) => pv.profile)

    const origin = s.kind === 'blend' ? s.origin : profiles[0]?.origin ?? {
      kind: 'legacy_unattributed' as const,
      reviewStatus: 'legacy_unreviewed' as const,
    }

    const color = LEGACY_SUBSTANCE_COLORS[s.id] ?? '#2563eb'

    items.push({
      id: s.id,
      slug: s.slug,
      name: s.name,
      aliases: s.aliases,
      tags: s.tags,
      category: s.kind === 'single' ? s.category : 'blend',
      kind: s.kind,
      substance: s,
      profiles,
      profileViews,
      origin,
      color,
      componentOnly: isComponentOnly,
      deprecated: isDeprecated,
      substanceProvenance: {
        type: 'official',
        substanceId: s.id,
        datasetVersion: officialDataset.metadata.datasetVersion,
      },
    })
  }

  // 2. CustomSubstances do usuário
  for (const cs of customSubstances) {
    const userProfiles = customProfiles.filter(
      (cp) => cp.owner.type === 'custom' && cp.owner.substanceId === cs.id,
    )
    const profileViews: LibraryProfileView[] = userProfiles.map((up) => ({
      provenance: 'custom_profile' as const,
      customProfileId: up.id,
      owner: up.owner,
      profile: {
        id: up.id,
        route: up.route,
        formulation: up.formulation,
        ester: up.ester,
        halfLife: up.halfLife,
        tmaxSpec: up.tmaxSpec,
        bioavailability: up.bioavailability,
        populationContext: up.populationContext,
        origin: up.origin,
      },
    }))

    const profiles = profileViews.map((pv) => pv.profile)

    const syntheticSubstance: SingleSubstance = {
      kind: 'single',
      id: cs.id,
      slug: cs.slug,
      name: cs.name,
      aliases: cs.aliases,
      category: cs.category,
      tags: cs.tags,
      profiles,
    }

    items.push({
      id: cs.id,
      slug: cs.slug,
      name: cs.name,
      aliases: cs.aliases,
      tags: cs.tags,
      category: cs.category,
      kind: 'single',
      substance: syntheticSubstance,
      profiles,
      profileViews,
      origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      color: '#2563eb',
      componentOnly: false,
      deprecated: false,
      substanceProvenance: {
        type: 'custom',
        customSubstanceId: cs.id,
      },
    })
  }

  // 3. Filtrar itens visíveis (oculta componentOnly e deprecated por padrão)
  let visible = items.filter((item) => !item.componentOnly && !item.deprecated)

  // 4. Filtrar por origem
  if (originFilter !== 'all') {
    visible = visible.filter((item) => {
      if (item.kind === 'blend') {
        return item.origin.kind === originFilter
      }

      return (
        item.profileViews.some((profileView) => profileView.profile.origin.kind === originFilter) ||
        (item.profileViews.length === 0 && item.origin.kind === originFilter)
      )
    })
  }

  // 5. Filtrar por texto (case e diacritic-insensitive)
  if (searchQuery.trim()) {
    const q = normalizeSearchText(searchQuery)
    visible = visible.filter((item) => {
      if (normalizeSearchText(item.name).includes(q)) return true
      if (normalizeSearchText(item.slug).includes(q)) return true
      if (item.aliases.some((a) => normalizeSearchText(a).includes(q))) return true
      if (item.tags.some((t) => normalizeSearchText(t).includes(q))) return true
      return false
    })
  }

  return visible
}
