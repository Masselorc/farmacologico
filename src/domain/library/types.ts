import type { Duration, InstantIso } from '../shared/types.datetime'
import type { AdministrationRoute, SubstanceCategory, TmaxSpecification } from '../data-management/types'
import type { DisplayColor, ProfileOrigin } from '../types'

export interface Source {
  id: string
  doi?: string
  pmid?: string
  url?: string
  title?: string
  authors?: string[]
  year?: number
  population?: string
  notes?: string
  reviewedAt?: InstantIso
}

export interface PharmacokineticProfile {
  id: string
  route: AdministrationRoute
  formulation?: string
  ester?: string
  halfLife: Duration
  tmaxSpec: TmaxSpecification
  bioavailability?: number | { min: number; max: number }
  populationContext?: string
  origin: ProfileOrigin
  deprecated?: boolean
}

export interface SingleSubstance {
  kind: 'single'
  id: string
  slug: string
  name: string
  aliases: string[]
  category: SubstanceCategory
  tags: string[]
  profiles: PharmacokineticProfile[]
  componentOnly?: boolean
  deprecated?: boolean
}

export interface BlendComponent {
  substanceId: string
  profileId: string
  proportion: number
  displayColor?: DisplayColor
}

export interface BlendSubstance {
  kind: 'blend'
  id: string
  slug: string
  name: string
  aliases: string[]
  tags: string[]
  components: BlendComponent[]
  origin: ProfileOrigin
  deprecated?: boolean
}

export type Substance = SingleSubstance | BlendSubstance

export type DatasetIdMigration =
  | {
      entityKind: 'substance'
      fromId: string
      toId: string
      sinceDatasetVersion: number
      reason: string
    }
  | {
      entityKind: 'profile'
      fromSubstanceId: string
      fromProfileId: string
      toSubstanceId: string
      toProfileId: string
      sinceDatasetVersion: number
      reason: string
    }

export interface DatasetMetadata {
  datasetVersion: number
  updatedAt: InstantIso
  substanceCount: number
  changelog?: Array<{
    version: number
    date: InstantIso
    summary: string
  }>
  idMigrations?: DatasetIdMigration[]
}

export interface OfficialDataset {
  metadata: DatasetMetadata
  sources: Source[]
  substances: Substance[]
}
