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
