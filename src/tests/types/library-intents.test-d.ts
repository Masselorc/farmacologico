import { createComparatorIntent, createProtocolIntent } from '../../features/library/lib/intents'
import type { PharmacokineticProfile, SingleSubstance } from '../../domain/library/types'
import type { LibraryProfileView } from '../../features/library/lib/view'

declare const substance: SingleSubstance
declare const profile: PharmacokineticProfile

// @ts-expect-error Um Single sem selectedProfile não é um intent válido.
createComparatorIntent({ substance })

// @ts-expect-error A API de Single exige a proveniência em selectedProfile.
createComparatorIntent({ substance, profile })

// @ts-expect-error A API de Single exige a proveniência em selectedProfile.
createProtocolIntent({ substance, profile })

declare const profileView: LibraryProfileView

// @ts-expect-error O alias antigo profileView não substitui selectedProfile.
createComparatorIntent({ substance, profileView })

declare const fakeResolved: unknown
// @ts-expect-error builder não aceita seleção científica pré-resolvida
createComparatorIntent({ substance, selectedProfile: profileView, resolvedSelection: fakeResolved })

declare const fakeSelection: unknown
// @ts-expect-error builder não aceita snapshot fornecido separadamente
createComparatorIntent({ substance, selectedProfile: profileView, selection: fakeSelection })

// @ts-expect-error resolvedSelection não pertence mais à API de Protocol Single
createProtocolIntent({ substance, selectedProfile: profileView, resolvedSelection: fakeResolved })

// @ts-expect-error selection pré-resolvida não pertence mais à API de Protocol Single
createProtocolIntent({ substance, selectedProfile: profileView, selection: fakeSelection })
