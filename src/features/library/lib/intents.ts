import type {
  DisplayColor,
  MassUnit,
  PaletteColorId,
  PkParametersSnapshot,
  ProtocolComponentSource,
  ScenarioSource,
  SelectedPkParameters,
} from '../../../domain/types'
import type {
  OfficialDataset,
  PharmacokineticProfile,
  Substance,
} from '../../../domain/library/types'
import { CURRENT_DATASET_VERSION } from '../../../domain/version'
import { LEGACY_SUBSTANCE_COLORS } from '../../../data/substances/legacy.dataset'
import { resolveProfileParameters, type ResolvedProfileParameters } from './selection'
import type { LibraryProfileView } from './view'

export interface LibraryComparatorIntent {
  kind: 'comparator'
  name: string
  color: PaletteColorId
  source: ScenarioSource
  displayUnit: MassUnit
  selectedPkParameters: SelectedPkParameters
}

export interface LibraryProtocolComponentIntent {
  substanceId: string
  profileId: string
  proportion: number
  displayColor?: DisplayColor
  source: ProtocolComponentSource
  selectedPkParameters: SelectedPkParameters
  pkParametersSnapshot?: PkParametersSnapshot
}

export interface LibraryProtocolIntent {
  kind: 'protocol'
  name: string
  components: LibraryProtocolComponentIntent[]
}

export interface CreateComparatorIntentParams {
  substance: Substance
  profileView?: LibraryProfileView
  profile?: PharmacokineticProfile
  resolvedSelection?: ResolvedProfileParameters
  selection?: {
    halfLifeMs: number
    tmaxMs: number | null
    snapshot: PkParametersSnapshot
    selectionNote?: SelectedPkParameters['selectionNote']
  }
  displayUnit?: MassUnit
  color?: PaletteColorId
}

/**
 * Cria um intent em memória para o Comparador.
 * PROIBIDO para BlendSubstance (§9).
 * ZERO doses geradas.
 */
export function createComparatorIntent(params: CreateComparatorIntentParams): LibraryComparatorIntent {
  if (params.substance.kind === 'blend') {
    throw new Error('BlendSubstance não pode ser adicionada diretamente ao Comparador como cenário simples')
  }

  const single = params.substance
  const profileView = params.profileView
  const profile = profileView?.profile ?? params.profile ?? single.profiles[0]
  if (!profile) {
    throw new Error(`Substância ${single.id} não possui perfis disponíveis`)
  }

  let resolved: ResolvedProfileParameters
  if (params.resolvedSelection) {
    resolved = params.resolvedSelection
  } else if (params.selection) {
    resolved = {
      selectedPkParameters: {
        halfLifeMs: params.selection.halfLifeMs,
        tmaxMs: params.selection.tmaxMs,
        ...(params.selection.selectionNote ? { selectionNote: params.selection.selectionNote } : {}),
      },
      pkParametersSnapshot: params.selection.snapshot,
      needsUserSelection: false,
      missingFields: [],
    }
  } else {
    resolved = resolveProfileParameters(profile)
  }

  if (resolved.needsUserSelection) {
    throw new Error(`Seleção incompleta para os parâmetros: ${resolved.missingFields.join(', ')}`)
  }
  if (resolved.selectedPkParameters.halfLifeMs <= 0) {
    throw new Error('halfLifeMs deve ser maior que zero')
  }

  let source: ScenarioSource
  if (profileView && profileView.provenance === 'custom_profile') {
    source = {
      type: 'custom_profile',
      customProfileId: profileView.customProfileId,
      pkParametersSnapshot: resolved.pkParametersSnapshot,
    }
  } else {
    source = {
      type: 'library',
      substanceId: profileView?.substanceId ?? single.id,
      profileId: profileView?.profileId ?? profile.id,
      datasetVersion: profileView?.datasetVersion ?? CURRENT_DATASET_VERSION,
      pkParametersSnapshot: resolved.pkParametersSnapshot,
    }
  }

  const color = params.color ?? LEGACY_SUBSTANCE_COLORS[single.id] ?? '#2563eb'

  return {
    kind: 'comparator',
    name: single.name,
    color,
    displayUnit: params.displayUnit ?? 'mg',
    source,
    selectedPkParameters: resolved.selectedPkParameters,
  }
}

export interface CreateProtocolIntentParams {
  substance: Substance
  profileView?: LibraryProfileView
  profile?: PharmacokineticProfile
  resolvedSelection?: ResolvedProfileParameters
  selection?: {
    halfLifeMs: number
    tmaxMs: number | null
    snapshot: PkParametersSnapshot
    selectionNote?: SelectedPkParameters['selectionNote']
  }
  dataset?: OfficialDataset
}

/**
 * Cria um intent em memória para Protocolos.
 * Suporta Single (1 componente proporção 1) e Blend (N componentes proporcionais).
 * ZERO doses totais, horários ou agendamento gerados.
 */
export function createProtocolIntent(params: CreateProtocolIntentParams): LibraryProtocolIntent {
  if (params.substance.kind === 'single') {
    const single = params.substance
    const profileView = params.profileView
    const profile = profileView?.profile ?? params.profile ?? single.profiles[0]
    if (!profile) {
      throw new Error(`Substância ${single.id} não possui perfil`)
    }

    let resolved: ResolvedProfileParameters
    if (params.resolvedSelection) {
      resolved = params.resolvedSelection
    } else if (params.selection) {
      resolved = {
        selectedPkParameters: {
          halfLifeMs: params.selection.halfLifeMs,
          tmaxMs: params.selection.tmaxMs,
          ...(params.selection.selectionNote ? { selectionNote: params.selection.selectionNote } : {}),
        },
        pkParametersSnapshot: params.selection.snapshot,
        needsUserSelection: false,
        missingFields: [],
      }
    } else {
      resolved = resolveProfileParameters(profile)
    }

    if (resolved.needsUserSelection) {
      throw new Error(`Seleção incompleta para os parâmetros: ${resolved.missingFields.join(', ')}`)
    }
    if (resolved.selectedPkParameters.halfLifeMs <= 0) {
      throw new Error('halfLifeMs deve ser maior que zero')
    }

    let compSource: ProtocolComponentSource
    if (profileView && profileView.provenance === 'custom_profile') {
      compSource = {
        type: 'custom_profile',
        customProfileId: profileView.customProfileId,
      }
    } else {
      compSource = {
        type: 'library',
        substanceId: profileView?.substanceId ?? single.id,
        profileId: profileView?.profileId ?? profile.id,
        datasetVersion: profileView?.datasetVersion ?? CURRENT_DATASET_VERSION,
      }
    }

    return {
      kind: 'protocol',
      name: single.name,
      components: [
        {
          substanceId: single.id,
          profileId: profile.id,
          proportion: 1,
          displayColor: {
            paletteColor: LEGACY_SUBSTANCE_COLORS[single.id] ?? '#2563eb',
          },
          source: compSource,
          selectedPkParameters: resolved.selectedPkParameters,
          pkParametersSnapshot: resolved.pkParametersSnapshot,
        },
      ],
    }
  }

  // Blend
  const blend = params.substance
  const dataset = params.dataset
  if (!dataset) {
    throw new Error('Dataset necessário para resolver os componentes do Blend')
  }

  const components: LibraryProtocolComponentIntent[] = blend.components.map((comp) => {
    const targetSub = dataset.substances.find((s) => s.id === comp.substanceId)
    if (!targetSub || targetSub.kind !== 'single') {
      throw new Error(`Componente ${comp.substanceId} do blend não encontrado ou inválido`)
    }
    const targetProf = targetSub.profiles.find((p) => p.id === comp.profileId)
    if (!targetProf) {
      throw new Error(`Perfil ${comp.profileId} do componente ${comp.substanceId} não encontrado`)
    }

    const resolved = resolveProfileParameters(targetProf)
    if (resolved.needsUserSelection) {
      throw new Error(`Seleção incompleta no componente ${comp.substanceId}`)
    }

    return {
      substanceId: comp.substanceId,
      profileId: comp.profileId,
      proportion: comp.proportion,
      displayColor: comp.displayColor,
      source: {
        type: 'library',
        substanceId: comp.substanceId,
        profileId: comp.profileId,
        datasetVersion: dataset.metadata.datasetVersion ?? CURRENT_DATASET_VERSION,
      },
      selectedPkParameters: resolved.selectedPkParameters,
      pkParametersSnapshot: resolved.pkParametersSnapshot,
    }
  })

  return {
    kind: 'protocol',
    name: blend.name,
    components,
  }
}
