import type { DatasetMetadata, OfficialDataset, Substance } from '../../domain/library/types'
import { CURRENT_DATASET_VERSION } from '../../domain/version'
import { OFFICIAL_SOURCES_V1 } from '../sources'
import { LEGACY_SUBSTANCES } from './legacy.dataset'

export { LEGACY_SUBSTANCES, LEGACY_SUBSTANCE_COLORS } from './legacy.dataset'

export const DATASET_METADATA_V1: DatasetMetadata = {
  datasetVersion: CURRENT_DATASET_VERSION,
  updatedAt: '2026-09-02T12:00:00.000Z',
  substanceCount: LEGACY_SUBSTANCES.length,
  idMigrations: [],
}

export const OFFICIAL_DATASET_V1: OfficialDataset = {
  metadata: DATASET_METADATA_V1,
  sources: OFFICIAL_SOURCES_V1,
  substances: LEGACY_SUBSTANCES,
}

/**
 * Retorna apenas substâncias visíveis no seletor comum da Biblioteca:
 * não são componentOnly e não são deprecated.
 */
export function getVisibleSubstances(dataset: OfficialDataset = OFFICIAL_DATASET_V1): Substance[] {
  return dataset.substances.filter((s) => {
    if (s.deprecated) return false
    if (s.kind === 'single' && s.componentOnly === true) return false
    return true
  })
}

/**
 * Busca uma substância por ID no dataset oficial.
 */
export function findSubstance(
  dataset: OfficialDataset,
  substanceId: string,
): Substance | undefined {
  return dataset.substances.find((s) => s.id === substanceId)
}

/**
 * Busca um perfil no dataset oficial respeitando identidade composta (substanceId, profileId).
 */
export function findProfile(
  dataset: OfficialDataset,
  substanceId: string,
  profileId: string,
) {
  const substance = findSubstance(dataset, substanceId)
  if (!substance || substance.kind !== 'single') return undefined
  return substance.profiles.find((p) => p.id === profileId)
}
