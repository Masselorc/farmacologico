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
import { resolveProfileParameters, type ProfileParameterSelectionInput } from './selection'
import type { LibraryProfileView, LibrarySubstanceProvenance } from './view'

export interface LibraryComparatorIntent {
  kind: 'comparator'
  name: string
  color: PaletteColorId
  displayUnit: MassUnit
  source: ScenarioSource
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

export interface CreateComparatorIntentParams {
  substance: SingleSubstance
  substanceProvenance?: LibrarySubstanceProvenance
  selectedProfile: LibraryProfileView
  parameterSelection?: ProfileParameterSelectionInput
  displayUnit?: MassUnit
  color?: PaletteColorId
}

export interface CreateSingleProtocolIntentParams {
  substance: SingleSubstance
  substanceProvenance?: LibrarySubstanceProvenance
  selectedProfile: LibraryProfileView
  parameterSelection?: ProfileParameterSelectionInput
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
 * Valida a invariante de identidade e proveniência: o perfil deve pertencer
 * estritamente à substância fornecida antes de qualquer resolução PK,
 * e resolve o perfil canônico oficial quando aplicável.
 */
export function assertSelectedProfileBelongsToSubstance(
  substance: SingleSubstance,
  selectedProfile: LibraryProfileView,
  substanceProvenance?: LibrarySubstanceProvenance,
): PharmacokineticProfile {
  // 1. Validação de namespace e proveniência
  if (substanceProvenance) {
    if (substanceProvenance.type === 'official') {
      if (substanceProvenance.substanceId !== substance.id) {
        throw new Error(
          `Substância oficial ${substanceProvenance.substanceId} diverge do id ${substance.id}`,
        )
      }
      if (selectedProfile.provenance === 'official') {
        if (selectedProfile.substanceId !== substance.id) {
          throw new Error(
            `Perfil oficial ${selectedProfile.profileId} pertence à substância ${selectedProfile.substanceId}, não a ${substance.id}`,
          )
        }
      } else if (selectedProfile.provenance === 'custom_profile') {
        if (selectedProfile.owner.type !== 'official') {
          throw new Error(
            `Perfil customizado com owner.type 'custom' não pode ser associado a substância official no namespace`,
          )
        }
        if (selectedProfile.owner.substanceId !== substance.id) {
          throw new Error(
            `Perfil customizado ${selectedProfile.customProfileId} pertence à substância ${selectedProfile.owner.substanceId}, não a ${substance.id}`,
          )
        }
      }
    } else if (substanceProvenance.type === 'custom') {
      if (substanceProvenance.customSubstanceId !== substance.id) {
        throw new Error(
          `Substância customizada ${substanceProvenance.customSubstanceId} diverge do id ${substance.id}`,
        )
      }
      if (selectedProfile.provenance === 'official') {
        throw new Error(
          `Perfil oficial não pode ser associado a substância customizada no namespace`,
        )
      } else if (selectedProfile.provenance === 'custom_profile') {
        if (selectedProfile.owner.type !== 'custom') {
          throw new Error(
            `Perfil customizado com owner.type 'official' não pode ser associado a substância customizada no namespace`,
          )
        }
        if (selectedProfile.owner.substanceId !== substance.id) {
          throw new Error(
            `Perfil customizado ${selectedProfile.customProfileId} pertence à substância ${selectedProfile.owner.substanceId}, não a ${substance.id}`,
          )
        }
      }
    }
  } else {
    // Caso substanceProvenance não seja explicitamente fornecido, valida as invariantes de identificador
    if (selectedProfile.provenance === 'official') {
      if (selectedProfile.substanceId !== substance.id) {
        throw new Error(
          `Perfil oficial ${selectedProfile.profileId} pertence à substância ${selectedProfile.substanceId}, não a ${substance.id}`,
        )
      }
    } else if (selectedProfile.provenance === 'custom_profile') {
      if (selectedProfile.owner.substanceId !== substance.id) {
        throw new Error(
          `Perfil customizado ${selectedProfile.customProfileId} pertence à substância ${selectedProfile.owner.substanceId}, não a ${substance.id}`,
        )
      }
    }
  }

  // 2. Resolução do profile canônico e verificação de payload PK
  if (selectedProfile.provenance === 'official') {
    const canonicalProfile = substance.profiles.find((p) => p.id === selectedProfile.profileId)
    if (!canonicalProfile) {
      throw new Error(
        `Perfil oficial ${selectedProfile.profileId} não encontrado na substância ${substance.id}`,
      )
    }

    if (selectedProfile.profile.id !== canonicalProfile.id) {
      throw new Error(
        `Identidade do perfil selecionado (${selectedProfile.profile.id}) diverge do perfil canônico (${canonicalProfile.id})`,
      )
    }

    if (
      selectedProfile.profile.route !== canonicalProfile.route ||
      JSON.stringify(selectedProfile.profile.halfLife) !== JSON.stringify(canonicalProfile.halfLife) ||
      JSON.stringify(selectedProfile.profile.tmaxSpec) !== JSON.stringify(canonicalProfile.tmaxSpec)
    ) {
      throw new Error('Payload farmacocinético diverge da definição canônica da substância')
    }

    return canonicalProfile
  } else {
    // custom_profile
    if (selectedProfile.profile.id !== selectedProfile.customProfileId) {
      throw new Error(
        `Perfil customizado ${selectedProfile.customProfileId} diverge de profile.id ${selectedProfile.profile.id}`,
      )
    }

    return selectedProfile.profile
  }
}

/**
 * Resolve a seleção atômica a partir do perfil e das escolhas do usuário,
 * garantindo coerência matemática e de snapshot em uma única operação.
 */
function resolveAndValidateProfileSelection(
  profile: PharmacokineticProfile,
  parameterSelection?: ProfileParameterSelectionInput,
): ValidatedProfileSelection {
  const resolved = resolveProfileParameters(profile, parameterSelection)

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

  const canonicalProfile = assertSelectedProfileBelongsToSubstance(
    single,
    selectedProfile,
    params.substanceProvenance,
  )

  const { selectedPkParameters, pkParametersSnapshot } = resolveAndValidateProfileSelection(
    canonicalProfile,
    params.parameterSelection,
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

    const canonicalProfile = assertSelectedProfileBelongsToSubstance(
      single,
      selectedProfile,
      params.substanceProvenance,
    )

    const { selectedPkParameters, pkParametersSnapshot } = resolveAndValidateProfileSelection(
      canonicalProfile,
      params.parameterSelection,
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
