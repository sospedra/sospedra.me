import type { Difficulty, ISOAlpha2, LocalizedText } from './model'

export const GEO_CORPUS_SCHEMA_VERSION = 1 as const

export type CityCoverageReason =
  | 'default'
  | 'europe-plus'
  | 'population-over-10m'

export interface GeoCorpusSourceReference {
  sourceRevision: string
  geonamesSnapshotDate: string
  worldBankPopulationYear: number
}

export interface GeneratedCityRecord {
  geonamesId: number
  wikidataId?: string
  countryCode: ISOAlpha2
  names: LocalizedText
  acceptedNames: Record<'en' | 'es', string[]>
  latitude: number
  longitude: number
  population: number
  populationRank: number
  featureCode: string
  isCapital: boolean
  difficulty: Difficulty
  sourceRevision: string
}

export interface CountryCityCoverage {
  reasons: CityCoverageReason[]
  rankedNonCapitalTarget: number
  rankedNonCapitalSelected: number
  eligibleNonCapitalAvailable: number
  shortfall: boolean
}

export interface GeneratedCountryCorpusRecord {
  code: ISOAlpha2
  iso3: string
  names: LocalizedText
  continent: 'AF' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA'
  worldBankPopulation: number | null
  worldBankPopulationYear: number
  capitalCityIds: number[]
  cityIds: number[]
  coverage: CountryCityCoverage
  sourceRevision: string
}

export interface GeneratedCityCorpus {
  schemaVersion: typeof GEO_CORPUS_SCHEMA_VERSION
  sourceRevision: string
  policyRevision: string
  sources: GeoCorpusSourceReference
  cities: GeneratedCityRecord[]
}

export interface GeneratedCountryCorpus {
  schemaVersion: typeof GEO_CORPUS_SCHEMA_VERSION
  sourceRevision: string
  policyRevision: string
  rosterRevision: string
  countries: GeneratedCountryCorpusRecord[]
}

export type CityOverrideAction =
  | {
      action: 'exclude'
      geonamesId: number
      countryCode: ISOAlpha2
      reason: string
    }
  | {
      action: 'include'
      geonamesId: number
      countryCode: ISOAlpha2
      reason: string
    }
  | {
      action: 'capital'
      geonamesId: number
      countryCode: ISOAlpha2
      isCapital: boolean
      reason: string
    }
  | {
      action: 'names'
      geonamesId: number
      countryCode: ISOAlpha2
      names?: Partial<LocalizedText>
      acceptedNames?: Partial<Record<'en' | 'es', string[]>>
      reason: string
    }
