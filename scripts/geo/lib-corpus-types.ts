import type { CityOverrideAction } from '../../app/meridian/corpus-model.ts'
import type { CountryRecord, Difficulty } from '../../app/meridian/model.ts'

export type RosterDocument = {
  schemaVersion: 1
  rosterRevision: string
  recognitionBasis: {
    expectedCountryCount: number
  }
  countryCodes: string[]
}

export type CoveragePolicy = {
  schemaVersion: 1
  policyRevision: string
  countryPopulation: {
    indicator: string
    snapshotYear: number
    largeCountryThreshold: number
    comparison: 'greater-than'
  }
  coverage: {
    largeCountryRankedNonCapitalCount: number
    europePlusRankedNonCapitalCount: number
    defaultRankedNonCapitalCount: number
    includeEveryCapital: true
    capitalCountsTowardRankedCount: false
    shortfall: 'include-all-eligible-localities-without-padding'
  }
  europePlus: {
    countryCodes: string[]
  }
  citySelection: {
    featureClass: 'P'
    eligibleFeatureCodes: string[]
    capitalEligibilityOverridesFeatureCode: true
  }
  difficulty: {
    capitalMaximumDifficulty: Difficulty
  }
}

export type CityOverrideDocument = {
  schemaVersion: 1
  policyRevision: string
  overrides: CityOverrideAction[]
  reviewQueue: {
    countryCode: string
    topic: string
    reason: string
  }[]
}

export type LockedFile = {
  path: string
  sha256: string
}

export type ArchiveFile = LockedFile & {
  archiveEntry: string
}

export type CorpusSourceLock = {
  schemaVersion: 1
  sourceRevision: string
  importReady: boolean
  geonames: {
    snapshotDate: string
    files: {
      cities: ArchiveFile
      alternateNames: ArchiveFile
      countryInfo: LockedFile
    }
  }
  worldBank: {
    indicator: string
    snapshotYear: number
    file: LockedFile
  }
  naturalEarth: {
    file: LockedFile
  }
}

export type CountryInfo = {
  code: string
  iso3: string
  capitalName: string
  continent: string
}

export type WorldBankPopulation = {
  code: string
  iso3: string
  year: number
  value: number | null
}

export type CityCandidate = {
  geonamesId: number
  countryCode: string
  name: string
  asciiName: string
  latitude: number
  longitude: number
  featureCode: string
  population: number
  eligibleByFeature: boolean
  isCapital: boolean
}

export type RankBasis = {
  geonamesId: number
  population: number
}

export type CountryBucket = {
  eligibleCandidateAvailable: number
  topCandidates: CityCandidate[]
  featureCapitals: Map<number, CityCandidate>
  nameCapitals: Map<number, CityCandidate>
  explicitCapitals: Map<number, CityCandidate>
  forced: Map<number, CityCandidate>
  rankBasis: RankBasis[]
}

export type AlternateName = {
  id: number
  name: string
  preferred: boolean
  short: boolean
}

export type AlternateNames = {
  en: AlternateName[]
  es: AlternateName[]
  wikidataId?: string
}

export type NaturalEarthProperties = {
  ISO_A2?: string
  ISO_A2_EH?: string
  ISO_A3_EH?: string
  TYPE?: string
  ADMIN?: string
  SUBREGION?: string
  WIKIDATAID?: string
  NAME_EN?: string
  NAME_ES?: string
  NAME_LONG?: string
  FORMAL_EN?: string
}

export type NaturalEarthFeature = {
  properties: NaturalEarthProperties
  geometry: {
    type: string
    coordinates: unknown
  } | null
}

export type NaturalEarthDocument = {
  type: 'FeatureCollection'
  features: NaturalEarthFeature[]
}

export type ExistingCountryCorpus = {
  schemaVersion: number
  sourceRevision: string
  countries: CountryRecord[]
}

export type CountryDifficultyDocument = {
  schemaVersion: number
  revision: string
  description: string
  tiers: Record<string, Difficulty>
  /** Atoll nations with no usable silhouette; held out of the shape round. */
  shapeHolds?: string[]
}

export type WorldBankRow = {
  indicator?: { id?: string }
  country?: { id?: string }
  countryiso3code?: string
  date?: string
  value?: number | null
}
