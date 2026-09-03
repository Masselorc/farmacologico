import type { CustomProfile, CustomSubstance } from '../../../domain/data-management/types'
import type { OfficialDataset, PharmacokineticProfile, SingleSubstance, Substance } from '../../../domain/library/types'
import type { PaletteColorId } from '../../../domain/shared/colors'
import type { ProfileOrigin } from '../../../domain/types'
import { LEGACY_SUBSTANCE_COLORS } from '../../../data/substances/legacy.dataset'

export type OriginFilterKind = 'all' | 'legacy_unattributed' | 'literature' | 'user_defined'

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
  origin: ProfileOrigin
  color: PaletteColorId
  componentOnly: boolean
  deprecated: boolean
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

    // Perfis oficiais da substância
    const profiles: PharmacokineticProfile[] = s.kind === 'single' ? [...s.profiles] : []

    // Adiciona perfis customizados vinculados a esta substância oficial
    if (s.kind === 'single') {
      const userProfiles = customProfiles.filter(
        (cp) => cp.owner.type === 'official' && cp.owner.substanceId === s.id,
      )
      for (const up of userProfiles) {
        profiles.push({
          id: up.id,
          route: up.route,
          formulation: up.formulation,
          ester: up.ester,
          halfLife: up.halfLife,
          tmaxSpec: up.tmaxSpec,
          bioavailability: up.bioavailability,
          populationContext: up.populationContext,
          origin: up.origin,
        })
      }
    }

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
      origin,
      color,
      componentOnly: isComponentOnly,
      deprecated: isDeprecated,
    })
  }

  // 2. CustomSubstances do usuário
  for (const cs of customSubstances) {
    const userProfiles = customProfiles.filter(
      (cp) => cp.owner.type === 'custom' && cp.owner.substanceId === cs.id,
    )
    const profiles: PharmacokineticProfile[] = userProfiles.map((up) => ({
      id: up.id,
      route: up.route,
      formulation: up.formulation,
      ester: up.ester,
      halfLife: up.halfLife,
      tmaxSpec: up.tmaxSpec,
      bioavailability: up.bioavailability,
      populationContext: up.populationContext,
      origin: up.origin,
    }))

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
      origin: { kind: 'user_defined', reviewStatus: 'not_applicable' },
      color: '#2563eb',
      componentOnly: false,
      deprecated: false,
    })
  }

  // 3. Filtrar itens visíveis (oculta componentOnly e deprecated por padrão)
  let visible = items.filter((item) => !item.componentOnly && !item.deprecated)

  // 4. Filtrar por origem
  if (originFilter !== 'all') {
    visible = visible.filter((item) => {
      if (originFilter === 'user_defined') {
        return item.origin.kind === 'user_defined' || item.profiles.some((p) => p.origin.kind === 'user_defined')
      }
      return item.origin.kind === originFilter
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
