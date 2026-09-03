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
import { resolveProfileParameters } from './selection'

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
  profile?: PharmacokineticProfile
  selection?: {
    halfLifeMs: number
    tmaxMs: number | null
    snapshot: PkParametersSnapshot
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
  const profile = params.profile ?? single.profiles[0]
  if (!profile) {
    throw new Error(`Substância ${single.id} não possui perfis disponíveis`)
  }

  const resolved = params.selection
    ? {
        selectedPkParameters: {
          halfLifeMs: params.selection.halfLifeMs,
          tmaxMs: params.selection.tmaxMs,
        },
        pkParametersSnapshot: params.selection.snapshot,
      }
    : resolveProfileParameters(profile)

  const color = params.color ?? LEGACY_SUBSTANCE_COLORS[single.id] ?? '#2563eb'

  return {
    kind: 'comparator',
    name: single.name,
    color,
    displayUnit: params.displayUnit ?? 'mg',
    source: {
      type: 'library',
      substanceId: single.id,
      profileId: profile.id,
      datasetVersion: CURRENT_DATASET_VERSION,
      pkParametersSnapshot: resolved.pkParametersSnapshot,
    },
    selectedPkParameters: resolved.selectedPkParameters,
  }
}

export interface CreateProtocolIntentParams {
  substance: Substance
  profile?: PharmacokineticProfile
  selection?: {
    halfLifeMs: number
    tmaxMs: number | null
    snapshot: PkParametersSnapshot
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
    const profile = params.profile ?? single.profiles[0]
    if (!profile) {
      throw new Error(`Substância ${single.id} não possui perfil`)
    }

    const resolved = params.selection
      ? {
          selectedPkParameters: {
            halfLifeMs: params.selection.halfLifeMs,
            tmaxMs: params.selection.tmaxMs,
          },
          pkParametersSnapshot: params.selection.snapshot,
        }
      : resolveProfileParameters(profile)

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
          source: {
            type: 'library',
            substanceId: single.id,
            profileId: profile.id,
            datasetVersion: CURRENT_DATASET_VERSION,
          },
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

    return {
      substanceId: comp.substanceId,
      profileId: comp.profileId,
      proportion: comp.proportion,
      displayColor: comp.displayColor,
      source: {
        type: 'library',
        substanceId: comp.substanceId,
        profileId: comp.profileId,
        datasetVersion: CURRENT_DATASET_VERSION,
        pkParametersSnapshot: resolved.pkParametersSnapshot,
      },
      selectedPkParameters: resolved.selectedPkParameters,
    }
  })

  return {
    kind: 'protocol',
    name: blend.name,
    components,
  }
}
