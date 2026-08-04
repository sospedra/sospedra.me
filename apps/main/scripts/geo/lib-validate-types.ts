import type {
  CountryRecord,
  LocalizedOption,
  LocalizedText,
} from '../../app/meridian/model.ts'

export type Question = {
  id: string
  type: 'shape' | 'flag' | 'capital' | 'map'
  countryCode: string
  difficulty: number
  prompt: LocalizedText
  assetUrl?: string
  options?: LocalizedOption[]
  correctOptionId?: string
  answerCoordinate?: {
    latitude: number
    longitude: number
  }
}

export type Round = {
  id: string
  type: 'shape' | 'flag' | 'capital' | 'map'
  questionLimitMs: number
  roundLimitMs: number
  questions: Question[]
}

export type Challenge = {
  schemaVersion: number
  generatorVersion: string
  rulesVersion: string
  id: string
  publicationDate: string
  seed: string
  sourceRevision: string
  cityOptions: LocalizedOption[]
  rules: {
    choice: { min: number; max: number }
    streak: { step: number; cap: number }
    mapBands: { maxKm: number; score: number }[]
    feedbackMs: number
    wrongFeedbackMs: number
    roundSummaryMs: number
  }
  rounds: Round[]
}

export type CountryCorpus = {
  schemaVersion: number
  sourceRevision: string
  countries: CountryRecord[]
}

export type AssetEntry = {
  url: string
  sha256: string
  bytes: number
}

export type AssetManifest = {
  schemaVersion: number
  sourceRevision: string
  naturalEarth: {
    countries: { dataset: string; sha256: string }
    land: { dataset: string; sha256: string }
  }
  flagIcons: { version: string }
  shapes: Record<string, AssetEntry>
  flags: Record<string, AssetEntry>
  map: AssetEntry & { projection: string }
}

export type GenerationApproval = {
  schemaVersion: number
  sourceRevision: string
  citySourceRevision: string
  cityPolicyRevision: string
  generatorVersion: string
  rulesVersion: string
  reviewBasis: string
}

export type SourceLock = {
  schemaVersion: number
  sourceRevision: string
  naturalEarth: {
    license: string
    files: {
      countries: { sha256: string }
      land: { sha256: string }
    }
  }
  cldr: { license: string }
  flagIcons: { version: string; license: string }
  wikidata: {
    queryFile: string
    querySha256: string
    responseSha256: string
    license: string
  }
}

export type CorpusSourceLock = {
  schemaVersion: number
  sourceRevision: string
  geonames: {
    snapshotDate: string
    license: string
    files: Record<string, { path: string; sha256: string }>
  }
  worldBank: {
    indicator: string
    snapshotYear: number
    termsUrl: string
    file: { path: string; sha256: string }
  }
  naturalEarth: {
    file: { path: string; sha256: string }
  }
}

export type CityOverrides = {
  schemaVersion: number
  reviewQueue: { countryCode: string; topic: string; reason: string }[]
}
