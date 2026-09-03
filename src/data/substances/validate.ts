import type { DatasetIdMigration, OfficialDataset } from '../../domain/library/types'
import { officialDatasetSchema } from '../../validation/schemas/library'
import { proportionSumClose } from '../../domain/shared/tolerances'
import { CURRENT_DATASET_VERSION } from '../../domain/version'

export interface DatasetSemanticValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Valida integralmente a semântica e os invariantes de um OfficialDataset (§9, §9.1).
 */
export function validateOfficialDataset(dataset: OfficialDataset): DatasetSemanticValidationResult {
  const errors: string[] = []

  // 1. Zod schema validation
  const schemaResult = officialDatasetSchema.safeParse(dataset)
  if (!schemaResult.success) {
    errors.push(...schemaResult.error.issues.map((i) => `Schema error em ${i.path.join('.')}: ${i.message}`))
  }

  // 2. Metadata consistency
  if (dataset.metadata.substanceCount !== dataset.substances.length) {
    errors.push(
      `substanceCount em metadata (${dataset.metadata.substanceCount}) difere do total real (${dataset.substances.length})`,
    )
  }

  // 3. Source ID uniqueness
  const sourceIds = new Set<string>()
  for (const src of dataset.sources) {
    if (sourceIds.has(src.id)) {
      errors.push(`ID duplicado em sources: ${src.id}`)
    }
    sourceIds.add(src.id)
  }

  // 4. Substance ID & slug uniqueness
  const substanceIds = new Set<string>()
  const slugs = new Set<string>()

  for (const s of dataset.substances) {
    if (substanceIds.has(s.id)) {
      errors.push(`ID duplicado em substances: ${s.id}`)
    }
    substanceIds.add(s.id)

    if (slugs.has(s.slug)) {
      errors.push(`Slug duplicado em substances: ${s.slug}`)
    }
    slugs.add(s.slug)

    // Profile ID uniqueness within this substance
    if (s.kind === 'single') {
      const profileIds = new Set<string>()
      for (const p of s.profiles) {
        if (profileIds.has(p.id)) {
          errors.push(`Profile ID duplicado na substância ${s.id}: ${p.id}`)
        }
        profileIds.add(p.id)
      }
    }
  }

  // 5. Source resolution for literature profiles
  for (const s of dataset.substances) {
    if (s.kind === 'single') {
      for (const p of s.profiles) {
        if (p.origin.kind === 'literature') {
          for (const sId of p.origin.sourceIds) {
            if (!sourceIds.has(sId)) {
              errors.push(`Perfil ${p.id} da substância ${s.id} referencia sourceId inexistente: ${sId}`)
            }
          }
        }
      }
    }
  }

  // 5. Blend invariants and component resolution
  for (const s of dataset.substances) {
    if (s.kind === 'blend') {
      if (s.components.length === 0) {
        errors.push(`Blend ${s.id} não possui componentes`)
      }
      const proportions = s.components.map((c) => c.proportion)
      if (!proportionSumClose(proportions)) {
        errors.push(`Soma das proporções do Blend ${s.id} não é 1`)
      }

      for (const comp of s.components) {
        if (comp.proportion <= 0 || !Number.isFinite(comp.proportion)) {
          errors.push(`Componente ${comp.substanceId} do Blend ${s.id} possui proporção inválida: ${comp.proportion}`)
        }
        const target = dataset.substances.find((item) => item.id === comp.substanceId)
        if (!target) {
          errors.push(`Blend ${s.id} referencia componente inexistente: ${comp.substanceId}`)
        } else if (target.kind !== 'single') {
          errors.push(`Blend ${s.id} referencia componente que não é SingleSubstance: ${comp.substanceId}`)
        } else {
          const profile = target.profiles.find((p) => p.id === comp.profileId)
          if (!profile) {
            errors.push(
              `Blend ${s.id} referencia profileId inexistente ${comp.profileId} na substância ${comp.substanceId}`,
            )
          }
        }
      }
    }
  }

  // 6. ID Migrations validation (§9.1)
  if (dataset.metadata.idMigrations && dataset.metadata.idMigrations.length > 0) {
    validateMigrations(dataset.metadata.idMigrations, dataset, errors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateMigrations(
  migrations: DatasetIdMigration[],
  dataset: OfficialDataset,
  errors: string[],
): void {
  // Check for duplicate source in migration at the same or any version (no forks)
  const substanceMigrationSources = new Set<string>()
  const profileMigrationSources = new Set<string>()

  for (const m of migrations) {
    if (m.entityKind === 'substance') {
      if (substanceMigrationSources.has(m.fromId)) {
        errors.push(`Bifurcação/múltipla transição para substance ID ${m.fromId}`)
      }
      substanceMigrationSources.add(m.fromId)
    } else {
      const key = `${m.fromSubstanceId}:${m.fromProfileId}`
      if (profileMigrationSources.has(key)) {
        errors.push(`Bifurcação/múltipla transição para profile ${key}`)
      }
      profileMigrationSources.add(key)
    }
  }

  // Check for cycles & destinations
  for (const m of migrations) {
    if (m.entityKind === 'substance') {
      const visited = new Set<string>([m.fromId])
      let current = m.toId
      while (current) {
        if (visited.has(current)) {
          errors.push(`Ciclo detectado na migração de substância: ${current}`)
          break
        }
        visited.add(current)
        const next = migrations.find(
          (cand): cand is Extract<DatasetIdMigration, { entityKind: 'substance' }> =>
            cand.entityKind === 'substance' && cand.fromId === current,
        )
        if (!next) {
          // Final destination must exist in the dataset
          const exists = dataset.substances.some((s) => s.id === current)
          if (!exists) {
            errors.push(`Destino final da migração de substância não existe no dataset: ${current}`)
          }
          break
        }
        current = next.toId
      }
    } else {
      const visited = new Set<string>([`${m.fromSubstanceId}:${m.fromProfileId}`])
      let currSub = m.toSubstanceId
      let currProf = m.toProfileId
      while (currSub && currProf) {
        const key = `${currSub}:${currProf}`
        if (visited.has(key)) {
          errors.push(`Ciclo detectado na migração de profile: ${key}`)
          break
        }
        visited.add(key)
        const next = migrations.find(
          (cand): cand is Extract<DatasetIdMigration, { entityKind: 'profile' }> =>
            cand.entityKind === 'profile' &&
            cand.fromSubstanceId === currSub &&
            cand.fromProfileId === currProf,
        )
        if (!next) {
          const targetSub = dataset.substances.find((s) => s.id === currSub)
          if (!targetSub || targetSub.kind !== 'single') {
            errors.push(`Destino final da migração de profile referencia substância inexistente ou não-single: ${currSub}`)
          } else {
            const targetProf = targetSub.profiles.find((p) => p.id === currProf)
            if (!targetProf) {
              errors.push(`Destino final da migração de profile referencia perfil inexistente: ${currSub}:${currProf}`)
            }
          }
          break
        }
        currSub = next.toSubstanceId
        currProf = next.toProfileId
      }
    }
  }
}

/**
 * Valida o dataset oficial contra os requisitos de execução do runtime atual (§9, §9.1).
 */
export function validateRuntimeOfficialDataset(
  dataset: OfficialDataset,
): DatasetSemanticValidationResult {
  const errors: string[] = []

  if (dataset.metadata.datasetVersion !== CURRENT_DATASET_VERSION) {
    errors.push(
      `datasetVersion em metadata (${dataset.metadata.datasetVersion}) difere da versão esperada no runtime (${CURRENT_DATASET_VERSION})`,
    )
  }

  const semantic = validateOfficialDataset(dataset)
  errors.push(...semantic.errors)

  return {
    valid: errors.length === 0,
    errors,
  }
}
