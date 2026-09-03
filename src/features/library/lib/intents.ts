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
  BlendSubstance,
  OfficialDataset,
  PharmacokineticProfile,
  SingleSubstance,
} from '../../../domain/library/types'
import { CURRENT_DATASET_VERSION } from '../../../domain/version'
import { LEGACY_SUBSTANCE_COLORS } from '../../../data/substances/legacy.dataset'
import { pkParametersSnapshotSchema, selectedPkParametersSchema } from '../../../validation/schemas/pk'
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
  proportion: number
  displayColor?: DisplayColor
  source: ProtocolComponentSource
  selectedPkParameters: SelectedPkParameters
  pkParametersSnapshot: PkParametersSnapshot
}

export interface LibraryProtocolIntent {
  kind: 'protocol'
  name: string
  components: LibraryProtocolComponentIntent[]
}

interface SingleProfileIntentParams {
  /** Perfil exibido e selecionado na Biblioteca, com proveniência explícita. */
  selectedProfile: LibraryProfileView
  resolvedSelection?: ResolvedProfileParameters
  /** Compatibilidade transitória para uma seleção já convertida pela UI. */
  selection?: {
    halfLifeMs: number
    tmaxMs: number | null
    snapshot: PkParametersSnapshot
    selectionNote?: SelectedPkParameters['selectionNote']
  }
}

export interface CreateComparatorIntentParams {
  substance: SingleSubstance
  selectedProfile: LibraryProfileView
  resolvedSelection?: ResolvedProfileParameters
  selection?: SingleProfileIntentParams['selection']
  displayUnit?: MassUnit
  color?: PaletteColorId
}

export interface CreateSingleProtocolIntentParams extends SingleProfileIntentParams {
  substance: SingleSubstance
  dataset?: never
}

export interface CreateBlendProtocolIntentParams {
  substance: BlendSubstance
  dataset: OfficialDataset
}

export type CreateProtocolIntentParams =
  | CreateSingleProtocolIntentParams
  | CreateBlendProtocolIntentParams

function isSingleProtocolIntentParams(
  params: CreateProtocolIntentParams,
): params is CreateSingleProtocolIntentParams {
  return params.substance.kind === 'single'
}

interface ValidatedProfileSelection {
  selectedPkParameters: SelectedPkParameters
  pkParametersSnapshot: PkParametersSnapshot
}

/**
 * Resolve a seleção e valida novamente sua fronteira pública.
 * `ResolvedProfileParameters` é um tipo de transporte, não uma prova de
 * validade: chamadas externas também podem fornecer NaN, Infinity ou limites
 * inválidos em runtime.
 */
function resolveAndValidateProfileSelection(
  profile: PharmacokineticProfile,
  params: Pick<SingleProfileIntentParams, 'resolvedSelection' | 'selection'>,
): ValidatedProfileSelection {
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

  const selectedParsed = selectedPkParametersSchema.safeParse(resolved.selectedPkParameters)
  if (!selectedParsed.success) {
    throw new Error('Parâmetros farmacocinéticos selecionados inválidos')
  }

  const snapshotParsed = pkParametersSnapshotSchema.safeParse(resolved.pkParametersSnapshot)
  if (!snapshotParsed.success) {
    throw new Error('Snapshot dos parâmetros farmacocinéticos inválido')
  }

  return {
    selectedPkParameters: selectedParsed.data,
    pkParametersSnapshot: snapshotParsed.data,
  }
}

function scenarioSourceForProfile(
  selectedProfile: LibraryProfileView,
  pkParametersSnapshot: PkParametersSnapshot,
): ScenarioSource {
  if (selectedProfile.provenance === 'custom_profile') {
    return {
      type: 'custom_profile',
      customProfileId: selectedProfile.customProfileId,
      pkParametersSnapshot,
    }
  }

  return {
    type: 'library',
    substanceId: selectedProfile.substanceId,
    profileId: selectedProfile.profileId,
    datasetVersion: selectedProfile.datasetVersion,
    pkParametersSnapshot,
  }
}

function protocolSourceForProfile(selectedProfile: LibraryProfileView): ProtocolComponentSource {
  if (selectedProfile.provenance === 'custom_profile') {
    return {
      type: 'custom_profile',
      customProfileId: selectedProfile.customProfileId,
    }
  }

  return {
    type: 'library',
    substanceId: selectedProfile.substanceId,
    profileId: selectedProfile.profileId,
    datasetVersion: selectedProfile.datasetVersion,
  }
}

/**
 * Cria um intent em memória para o Comparador.
 * PROIBIDO para BlendSubstance (§9).
 * ZERO doses geradas.
 */
export function createComparatorIntent(params: CreateComparatorIntentParams): LibraryComparatorIntent {
  // O contrato público aceita apenas SingleSubstance. Esta defesa mantém uma
  // falha explícita se uma chamada JavaScript atravessar a tipagem com Blend.
  if (!Array.isArray(params.substance.profiles)) {
    throw new Error('BlendSubstance não pode ser adicionada diretamente ao Comparador como cenário simples')
  }
  if (!params.selectedProfile) {
    throw new Error('Proveniência do perfil selecionado é obrigatória')
  }

  const single = params.substance
  const selectedProfile = params.selectedProfile
  const { selectedPkParameters, pkParametersSnapshot } = resolveAndValidateProfileSelection(
    selectedProfile.profile,
    params,
  )

  const color = params.color ?? LEGACY_SUBSTANCE_COLORS[single.id] ?? '#2563eb'

  return {
    kind: 'comparator',
    name: single.name,
    color,
    displayUnit: params.displayUnit ?? 'mg',
    source: scenarioSourceForProfile(selectedProfile, pkParametersSnapshot),
    selectedPkParameters,
  }
}

/**
 * Cria um intent em memória para Protocolos.
 * Suporta Single (1 componente proporção 1) e Blend (N componentes proporcionais).
 * ZERO doses totais, horários ou agendamento gerados.
 */
export function createProtocolIntent(params: CreateProtocolIntentParams): LibraryProtocolIntent {
  if (isSingleProtocolIntentParams(params)) {
    const single = params.substance
    if (!params.selectedProfile) {
      throw new Error('Proveniência do perfil selecionado é obrigatória')
    }
    const selectedProfile = params.selectedProfile
    const { selectedPkParameters, pkParametersSnapshot } = resolveAndValidateProfileSelection(
      selectedProfile.profile,
      params,
    )

    return {
      kind: 'protocol',
      name: single.name,
      components: [
        {
          proportion: 1,
          displayColor: {
            paletteColor: LEGACY_SUBSTANCE_COLORS[single.id] ?? '#2563eb',
          },
          source: protocolSourceForProfile(selectedProfile),
          selectedPkParameters,
          pkParametersSnapshot,
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

    const { selectedPkParameters, pkParametersSnapshot } = resolveAndValidateProfileSelection(targetProf, {})

    return {
      proportion: comp.proportion,
      displayColor: comp.displayColor,
      source: {
        type: 'library',
        substanceId: comp.substanceId,
        profileId: comp.profileId,
        datasetVersion: dataset.metadata.datasetVersion ?? CURRENT_DATASET_VERSION,
      },
      selectedPkParameters,
      pkParametersSnapshot,
    }
  })

  return {
    kind: 'protocol',
    name: blend.name,
    components,
  }
}
