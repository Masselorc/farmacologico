import type {
  DatasetIdMigration,
  OfficialDataset,
  PharmacokineticProfile,
  SingleSubstance,
  Substance,
} from '../../domain/library/types'
import { CURRENT_DATASET_VERSION } from '../../domain/version'
import { OFFICIAL_DATASET_V1 } from './index'

export interface OfficialEntityResolver {
  hasSubstance(substanceId: string, datasetVersion: number): boolean
  hasSingleSubstance(substanceId: string, datasetVersion: number): boolean
  hasProfile(substanceId: string, profileId: string, datasetVersion: number): boolean
}

/**
 * Cria um OfficialEntityResolver com suporte a resolução direta e migração ordenada de IDs (§9.1).
 */
export function createOfficialEntityResolver(
  dataset: OfficialDataset = OFFICIAL_DATASET_V1,
): OfficialEntityResolver & {
  resolveSubstance(substanceId: string, datasetVersion?: number): Substance | undefined
  resolveProfile(
    substanceId: string,
    profileId: string,
    datasetVersion?: number,
  ): { substance: SingleSubstance; profile: PharmacokineticProfile } | undefined
} {
  const currentVersion = dataset.metadata.datasetVersion

  function resolveSubstanceId(substanceId: string, fromVersion: number): string | undefined {
    // 1. Verificação direta no dataset atual
    if (dataset.substances.some((s) => s.id === substanceId)) {
      return substanceId
    }

    // 2. Se a versão de origem for >= versão atual, não há migrações posteriores aplicáveis
    if (fromVersion >= currentVersion) {
      return undefined
    }

    const migrations = (dataset.metadata.idMigrations ?? [])
      .filter(
        (m): m is Extract<DatasetIdMigration, { entityKind: 'substance' }> =>
          m.entityKind === 'substance' &&
          m.sinceDatasetVersion > fromVersion &&
          m.sinceDatasetVersion <= currentVersion,
      )
      .sort((a, b) => a.sinceDatasetVersion - b.sinceDatasetVersion)

    let current = substanceId
    const visited = new Set<string>([current])

    while (true) {
      const step = migrations.find((m) => m.fromId === current)
      if (!step) break
      if (visited.has(step.toId)) {
        // Ciclo detectado
        return undefined
      }
      visited.add(step.toId)
      current = step.toId
      if (dataset.substances.some((s) => s.id === current)) {
        return current
      }
    }

    return dataset.substances.some((s) => s.id === current) ? current : undefined
  }

  function resolveProfileIdentity(
    substanceId: string,
    profileId: string,
    fromVersion: number,
  ): { substanceId: string; profileId: string } | undefined {
    // 1. Verificação direta
    const directSub = dataset.substances.find((s) => s.id === substanceId)
    if (directSub && directSub.kind === 'single') {
      const directProf = directSub.profiles.find((p) => p.id === profileId)
      if (directProf) {
        return { substanceId, profileId }
      }
    }

    if (fromVersion >= currentVersion) {
      return undefined
    }

    const migrations = (dataset.metadata.idMigrations ?? [])
      .filter(
        (m): m is Extract<DatasetIdMigration, { entityKind: 'profile' }> =>
          m.entityKind === 'profile' &&
          m.sinceDatasetVersion > fromVersion &&
          m.sinceDatasetVersion <= currentVersion,
      )
      .sort((a, b) => a.sinceDatasetVersion - b.sinceDatasetVersion)

    let currSub = substanceId
    let currProf = profileId
    const visited = new Set<string>([`${currSub}:${currProf}`])

    while (true) {
      const step = migrations.find(
        (m) => m.fromSubstanceId === currSub && m.fromProfileId === currProf,
      )
      if (!step) break
      const key = `${step.toSubstanceId}:${step.toProfileId}`
      if (visited.has(key)) {
        return undefined
      }
      visited.add(key)
      currSub = step.toSubstanceId
      currProf = step.toProfileId

      const sub = dataset.substances.find((s) => s.id === currSub)
      if (sub && sub.kind === 'single' && sub.profiles.some((p) => p.id === currProf)) {
        return { substanceId: currSub, profileId: currProf }
      }
    }

    const sub = dataset.substances.find((s) => s.id === currSub)
    if (sub && sub.kind === 'single' && sub.profiles.some((p) => p.id === currProf)) {
      return { substanceId: currSub, profileId: currProf }
    }

    return undefined
  }

  return {
    hasSubstance(substanceId: string, datasetVersion: number = CURRENT_DATASET_VERSION): boolean {
      return resolveSubstanceId(substanceId, datasetVersion) !== undefined
    },

    hasSingleSubstance(substanceId: string, datasetVersion: number = CURRENT_DATASET_VERSION): boolean {
      const resolvedId = resolveSubstanceId(substanceId, datasetVersion)
      if (!resolvedId) return false
      const sub = dataset.substances.find((s) => s.id === resolvedId)
      return sub !== undefined && sub.kind === 'single'
    },

    hasProfile(
      substanceId: string,
      profileId: string,
      datasetVersion: number = CURRENT_DATASET_VERSION,
    ): boolean {
      return resolveProfileIdentity(substanceId, profileId, datasetVersion) !== undefined
    },

    resolveSubstance(substanceId: string, datasetVersion: number = CURRENT_DATASET_VERSION): Substance | undefined {
      const resolvedId = resolveSubstanceId(substanceId, datasetVersion)
      if (!resolvedId) return undefined
      return dataset.substances.find((s) => s.id === resolvedId)
    },

    resolveProfile(
      substanceId: string,
      profileId: string,
      datasetVersion: number = CURRENT_DATASET_VERSION,
    ): { substance: SingleSubstance; profile: PharmacokineticProfile } | undefined {
      const resolved = resolveProfileIdentity(substanceId, profileId, datasetVersion)
      if (!resolved) return undefined
      const sub = dataset.substances.find((s) => s.id === resolved.substanceId)
      if (!sub || sub.kind !== 'single') return undefined
      const profile = sub.profiles.find((p) => p.id === resolved.profileId)
      if (!profile) return undefined
      return { substance: sub, profile }
    },
  }
}

export const defaultOfficialResolver = createOfficialEntityResolver()
