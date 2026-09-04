import { createComparatorIntent, createProtocolIntent } from '../../features/library/lib/intents'
import type { PharmacokineticProfile, SingleSubstance } from '../../domain/library/types'
import type { LibraryProfileView, LibrarySubstanceProvenance } from '../../features/library/lib/view'

declare const substance: SingleSubstance
declare const profile: PharmacokineticProfile
declare const provenance: LibrarySubstanceProvenance
declare const profileView: LibraryProfileView

// Happy paths válidos
createComparatorIntent({
  substance,
  substanceProvenance: provenance,
  selectedProfile: profileView,
})

createProtocolIntent({
  substance,
  substanceProvenance: provenance,
  selectedProfile: profileView,
})

// @ts-expect-error Um Single sem selectedProfile não é um intent válido.
createComparatorIntent({ substance, substanceProvenance: provenance })

// @ts-expect-error A API de Single exige a proveniência em selectedProfile.
createComparatorIntent({ substance, substanceProvenance: provenance, profile })

// @ts-expect-error A API de Single exige a proveniência em selectedProfile.
createProtocolIntent({ substance, substanceProvenance: provenance, profile })

// @ts-expect-error substanceProvenance é obrigatória para Single no Comparator
createComparatorIntent({ substance, selectedProfile: profileView })

// @ts-expect-error substanceProvenance é obrigatória para Single no Protocol
createProtocolIntent({ substance, selectedProfile: profileView })

// @ts-expect-error O alias antigo profileView não substitui selectedProfile.
createComparatorIntent({ substance, substanceProvenance: provenance, profileView })

declare const fakeResolved: unknown
// @ts-expect-error builder não aceita seleção científica pré-resolvida
createComparatorIntent({ substance, substanceProvenance: provenance, selectedProfile: profileView, resolvedSelection: fakeResolved })

declare const fakeSelection: unknown
// @ts-expect-error builder não aceita snapshot fornecido separadamente
createComparatorIntent({ substance, substanceProvenance: provenance, selectedProfile: profileView, selection: fakeSelection })

// @ts-expect-error resolvedSelection não pertence mais à API de Protocol Single
createProtocolIntent({ substance, substanceProvenance: provenance, selectedProfile: profileView, resolvedSelection: fakeResolved })

// @ts-expect-error selection pré-resolvida não pertence mais à API de Protocol Single
createProtocolIntent({ substance, substanceProvenance: provenance, selectedProfile: profileView, selection: fakeSelection })
