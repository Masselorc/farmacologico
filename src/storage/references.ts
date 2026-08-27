// Validador de integridade referencial interna do ConfigPayload (§6, §11, §12).
// Garante unicidade de IDs e resolução de referências a customSubstances, customProfiles e recipes.
// Referências a entidades 'official' possuem fronteira explícita com verificação de datasetVersion <= CURRENT_DATASET_VERSION.

import { CURRENT_DATASET_VERSION } from '../domain/version'
import type { ConfigPayload } from '../domain/types'

export interface ConfigReferenceValidationResult {
  valid: boolean
  error?: string
}

/**
 * Interface para resolução de entidades oficiais quando o dataset oficial (E10) for integrado.
 */
export interface OfficialEntityResolver {
  hasSubstance(substanceId: string, datasetVersion: number): boolean
  hasProfile(profileId: string, datasetVersion: number): boolean
}

/**
 * Valida a integridade referencial interna de um ConfigPayload.
 */
export function validateConfigReferences(
  payload: ConfigPayload,
  currentDatasetVersion = CURRENT_DATASET_VERSION,
  officialResolver?: OfficialEntityResolver,
): ConfigReferenceValidationResult {
  // 1. Unicidade de IDs nas coleções
  const customSubstanceIds = new Set<string>()
  for (const s of payload.customSubstances) {
    if (customSubstanceIds.has(s.id)) {
      return { valid: false, error: `ID duplicado em customSubstances: ${s.id}` }
    }
    customSubstanceIds.add(s.id)
  }

  const customProfileIds = new Set<string>()
  for (const p of payload.customProfiles) {
    if (customProfileIds.has(p.id)) {
      return { valid: false, error: `ID duplicado em customProfiles: ${p.id}` }
    }
    customProfileIds.add(p.id)
  }

  const recipeIds = new Set<string>()
  for (const r of payload.recipes) {
    if (recipeIds.has(r.id)) {
      return { valid: false, error: `ID duplicado em recipes: ${r.id}` }
    }
    recipeIds.add(r.id)
  }

  const scenarioIds = new Set<string>()
  for (const sc of payload.scenarios) {
    if (scenarioIds.has(sc.id)) {
      return { valid: false, error: `ID duplicado em scenarios: ${sc.id}` }
    }
    scenarioIds.add(sc.id)
  }

  const protocolIds = new Set<string>()
  for (const pr of payload.protocols) {
    if (protocolIds.has(pr.id)) {
      return { valid: false, error: `ID duplicado em protocols: ${pr.id}` }
    }
    protocolIds.add(pr.id)
  }

  // 2. CustomProfile owner
  for (const p of payload.customProfiles) {
    if (p.owner.type === 'custom') {
      if (!customSubstanceIds.has(p.owner.substanceId)) {
        return {
          valid: false,
          error: `CustomProfile ${p.id} referencia custom substance inexistente: ${p.owner.substanceId}`,
        }
      }
    } else if (p.owner.type === 'official' && officialResolver) {
      if (!officialResolver.hasSubstance(p.owner.substanceId, currentDatasetVersion)) {
        return {
          valid: false,
          error: `CustomProfile ${p.id} referencia official substance não encontrada no dataset: ${p.owner.substanceId}`,
        }
      }
    }
  }

  // 3. Scenario source
  for (const sc of payload.scenarios) {
    if (sc.source.type === 'custom_profile') {
      if (!customProfileIds.has(sc.source.customProfileId)) {
        return {
          valid: false,
          error: `Scenario ${sc.id} referencia customProfileId inexistente: ${sc.source.customProfileId}`,
        }
      }
    } else if (sc.source.type === 'library') {
      if (sc.source.datasetVersion > currentDatasetVersion) {
        return {
          valid: false,
          error: `Scenario ${sc.id} referencia datasetVersion futuro (${sc.source.datasetVersion} > ${currentDatasetVersion})`,
        }
      }
      if (officialResolver && !officialResolver.hasProfile(sc.source.profileId, sc.source.datasetVersion)) {
        return {
          valid: false,
          error: `Scenario ${sc.id} referencia library profile não encontrado no dataset: ${sc.source.profileId}`,
        }
      }
    }
  }

  // 4. ProtocolComponent source
  for (const pr of payload.protocols) {
    for (const comp of pr.components) {
      if (comp.source.type === 'custom_profile') {
        if (!customProfileIds.has(comp.source.customProfileId)) {
          return {
            valid: false,
            error: `ProtocolComponent ${comp.id} no protocolo ${pr.id} referencia customProfileId inexistente: ${comp.source.customProfileId}`,
          }
        }
      } else if (comp.source.type === 'library') {
        if (comp.source.datasetVersion > currentDatasetVersion) {
          return {
            valid: false,
            error: `ProtocolComponent ${comp.id} referencia datasetVersion futuro (${comp.source.datasetVersion} > ${currentDatasetVersion})`,
          }
        }
        if (officialResolver && !officialResolver.hasProfile(comp.source.profileId, comp.source.datasetVersion)) {
          return {
            valid: false,
            error: `ProtocolComponent ${comp.id} referencia library profile não encontrado: ${comp.source.profileId}`,
          }
        }
      }
    }
  }


  // 5. Favorites
  for (const fav of payload.favorites.substances) {
    if (fav.type === 'custom') {
      if (!customSubstanceIds.has(fav.substanceId)) {
        return {
          valid: false,
          error: `Favorite referencia custom substanceId inexistente: ${fav.substanceId}`,
        }
      }
    } else if (fav.type === 'official') {
      if (fav.datasetVersion > currentDatasetVersion) {
        return {
          valid: false,
          error: `Favorite referencia datasetVersion futuro (${fav.datasetVersion} > ${currentDatasetVersion})`,
        }
      }
      if (officialResolver && !officialResolver.hasSubstance(fav.substanceId, fav.datasetVersion)) {
        return {
          valid: false,
          error: `Favorite referencia official substance não encontrada: ${fav.substanceId}`,
        }
      }
    }
  }

  for (const rId of payload.favorites.recipeIds) {
    if (!recipeIds.has(rId)) {
      return {
        valid: false,
        error: `Favorite recipeId inexistente em recipes: ${rId}`,
      }
    }
  }

  return { valid: true }
}
