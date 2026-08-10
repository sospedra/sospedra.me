import { existsSync } from 'node:fs'
import { sumBy } from 'es-toolkit'
import type {
  GeneratedCityRecord,
  GeneratedCountryCorpusRecord,
} from '../../app/meridian/corpus-model.ts'
import type {
  CountryDifficulty,
  CountryRecord,
  Difficulty,
} from '../../app/meridian/model.ts'
import {
  assert,
  compareText,
  fail,
  pathFromRoot,
  readJson,
  uniqueNames,
  validSourceName,
} from './lib-corpus-primitives.ts'
import type {
  CityOverrideDocument,
  CorpusSourceLock,
  CountryDifficultyDocument,
  ExistingCountryCorpus,
  NaturalEarthDocument,
  NaturalEarthFeature,
} from './lib-corpus-types.ts'

const LEGACY_REVIEWED_COUNTRY_CODES = new Set([
  'AR',
  'AU',
  'BR',
  'BT',
  'CA',
  'CL',
  'EG',
  'FR',
  'GB',
  'GH',
  'ID',
  'IN',
  'IT',
  'JP',
  'KE',
  'KZ',
  'MX',
  'NZ',
  'TH',
  'ZA',
])

const NATURAL_EARTH_TYPE_SCORE: Record<string, number> = {
  'Sovereign country': 5,
  Country: 4,
  Sovereignty: 3,
  Indeterminate: 2,
}

type ExistingCountry = ExistingCountryCorpus['countries'][number]

const naturalEarthFeatureScore = (
  code: string,
  feature: NaturalEarthFeature,
) => {
  const properties = feature.properties
  return (
    (properties.ISO_A2 === code ? 100 : 0) +
    (properties.ISO_A2_EH === code ? 10 : 0) +
    (NATURAL_EARTH_TYPE_SCORE[properties.TYPE ?? ''] ?? 0)
  )
}

const primaryNaturalEarthFeature = (
  code: string,
  features: NaturalEarthFeature[],
) => {
  const candidates = features
    .filter(
      (feature) =>
        feature.properties.ISO_A2 === code ||
        feature.properties.ISO_A2_EH === code,
    )
    .sort(
      (left, right) =>
        naturalEarthFeatureScore(code, right) -
          naturalEarthFeatureScore(code, left) ||
        compareText(
          JSON.stringify(left.properties),
          JSON.stringify(right.properties),
        ),
    )
  return candidates[0]
}

const coordinatePointCount = (value: unknown): number => {
  if (!Array.isArray(value)) return 0
  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return 1
  }
  return sumBy(value, coordinatePointCount)
}

const hasRobustCountryGeometry = (feature: NaturalEarthFeature | undefined) =>
  Boolean(
    feature?.geometry &&
      (feature.geometry.type === 'Polygon' ||
        feature.geometry.type === 'MultiPolygon') &&
      coordinatePointCount(feature.geometry.coordinates) >= 4,
  )

const loadReviewedCountries = (): Map<string, ExistingCountry> => {
  const existingCountryCorpus = readJson<ExistingCountryCorpus>(
    'repo/geo/generated/countries.json',
  )
  const reviewed = existingCountryCorpus.countries.filter((country) =>
    LEGACY_REVIEWED_COUNTRY_CODES.has(country.code),
  )
  return new Map(reviewed.map((country) => [country.code, country]))
}

const loadNaturalEarthFeatures = (
  sourceLock: CorpusSourceLock,
  countryCodes: readonly string[],
): Map<string, NaturalEarthFeature | undefined> => {
  const naturalEarth = readJson<NaturalEarthDocument>(
    sourceLock.naturalEarth.file.path,
  )
  assert(
    naturalEarth.type === 'FeatureCollection' &&
      Array.isArray(naturalEarth.features),
    'Natural Earth countries must be a GeoJSON FeatureCollection',
  )
  return new Map(
    countryCodes.map((code) => [
      code,
      primaryNaturalEarthFeature(code, naturalEarth.features),
    ]),
  )
}

const editorialDifficulties = (
  document: CountryDifficultyDocument,
  rosterCodes: ReadonlySet<string>,
): Map<string, Difficulty> => {
  assert(document.schemaVersion === 1, 'Unsupported country-difficulty schema')
  assert(
    document.revision.trim().length > 0,
    'Country-difficulty table must declare a revision',
  )
  const tierEntries = Object.entries(document.tiers)
  for (const [code, tier] of tierEntries) {
    assert(
      rosterCodes.has(code),
      `Country-difficulty table tiers unknown country ${code}`,
    )
    assert(
      tier === 1 || tier === 2 || tier === 3 || tier === 4,
      `${code} has an invalid editorial difficulty tier`,
    )
  }
  return new Map<string, Difficulty>(tierEntries)
}

const shapeHoldCodes = (
  document: CountryDifficultyDocument,
  rosterCodes: ReadonlySet<string>,
): Set<string> => {
  const held = new Set(document.shapeHolds ?? [])
  for (const code of held) {
    assert(
      rosterCodes.has(code),
      `Country-difficulty shape hold references unknown country ${code}`,
    )
  }
  return held
}

const resolveCanonicalCapital = (
  country: GeneratedCountryCorpusRecord,
  cityById: Map<number, GeneratedCityRecord>,
): GeneratedCityRecord => {
  const capitalIds = country.capitalCityIds
  assert(
    capitalIds.length === 1,
    `${country.code} must resolve to exactly one canonical capital; additional capital roles require an explicit game-model change`,
  )
  const cityCapital = cityById.get(capitalIds[0] as number)
  assert(cityCapital, `${country.code} canonical capital is missing`)
  return cityCapital
}

const resolveEligibility = ({
  existing,
  shapeEligible,
  flagEligible,
  capitalEligible,
  shapeHeld,
}: {
  existing: ExistingCountry | undefined
  shapeEligible: boolean
  flagEligible: boolean
  capitalEligible: boolean
  shapeHeld: boolean
}): CountryRecord['eligibility'] => {
  const base = existing?.eligibility ?? {
    shape: shapeEligible,
    flag: flagEligible,
    capital: capitalEligible,
    map: capitalEligible,
  }
  return shapeHeld ? { ...base, shape: false } : base
}

const generatedAcceptedNames = (
  country: GeneratedCountryCorpusRecord,
  feature: NaturalEarthFeature,
): CountryRecord['acceptedNames'] => {
  const sourceNames = {
    en: validSourceName(feature.properties.NAME_EN),
    es: validSourceName(feature.properties.NAME_ES),
    long: validSourceName(feature.properties.NAME_LONG),
    formal: validSourceName(feature.properties.FORMAL_EN),
  }
  return {
    en: uniqueNames(country.names.en, [
      sourceNames.en ?? '',
      sourceNames.long ?? '',
      sourceNames.formal ?? '',
    ]),
    es: uniqueNames(country.names.es, [sourceNames.es ?? '']),
  }
}

const buildCapital = (
  existing: ExistingCountry | undefined,
  cityCapital: GeneratedCityRecord,
): CountryRecord['capital'] => {
  if (existing) {
    return {
      ...existing.capital,
      geonamesId: cityCapital.geonamesId,
      acceptedNames: cityCapital.acceptedNames,
    }
  }
  return {
    ...(cityCapital.wikidataId ? { wikidataId: cityCapital.wikidataId } : {}),
    geonamesId: cityCapital.geonamesId,
    names: cityCapital.names,
    acceptedNames: cityCapital.acceptedNames,
    latitude: cityCapital.latitude,
    longitude: cityCapital.longitude,
  }
}

// The editorial recognizability table is the single difficulty source;
// legacy per-country reviews keep names and eligibility only.
const editorialDifficultyByRound = (
  eligibility: CountryRecord['eligibility'],
  editorialDifficulty: Difficulty,
): CountryDifficulty => ({
  ...(eligibility.shape ? { shape: editorialDifficulty } : {}),
  ...(eligibility.flag ? { flag: editorialDifficulty } : {}),
  ...(eligibility.capital ? { capital: editorialDifficulty } : {}),
  ...(eligibility.map ? { map: editorialDifficulty } : {}),
})

type GameCountryInputs = {
  feature: NaturalEarthFeature | undefined
  existing: ExistingCountry | undefined
  editorialDifficulty: Difficulty
  shapeHeld: boolean
  capitalEligible: boolean
  cityById: Map<number, GeneratedCityRecord>
  sourceRevision: string
}

const toGameCountry = (
  country: GeneratedCountryCorpusRecord,
  inputs: GameCountryInputs,
): CountryRecord => {
  const { feature, existing, editorialDifficulty } = inputs
  const cityCapital = resolveCanonicalCapital(country, inputs.cityById)
  const countryWikidataId = validSourceName(feature?.properties.WIKIDATAID)
  const shapeEligible = hasRobustCountryGeometry(feature)
  const flagEligible = existsSync(
    pathFromRoot(
      `node_modules/flag-icons/flags/4x3/${country.code.toLocaleLowerCase('en')}.svg`,
    ),
  )
  const eligibility = resolveEligibility({
    existing,
    shapeEligible,
    flagEligible,
    capitalEligible: inputs.capitalEligible,
    shapeHeld: inputs.shapeHeld,
  })
  assert(
    !eligibility.shape || shapeEligible,
    `${country.code} cannot be shape-eligible without robust Natural Earth geometry`,
  )
  assert(
    !eligibility.flag || flagEligible,
    `${country.code} cannot be flag-eligible without a flag-icons asset`,
  )

  const difficulty = editorialDifficultyByRound(
    eligibility,
    editorialDifficulty,
  )
  assert(countryWikidataId, `${country.code} has no Natural Earth Wikidata id`)
  assert(
    feature?.properties.SUBREGION,
    `${country.code} has no Natural Earth subregion`,
  )
  assert(
    !feature.properties.ISO_A3_EH ||
      feature.properties.ISO_A3_EH === country.iso3,
    `${country.code} has mismatched GeoNames and Natural Earth ISO3 codes`,
  )
  return {
    code: country.code,
    iso3: country.iso3,
    wikidataId: existing?.wikidataId ?? countryWikidataId,
    names: existing?.names ?? country.names,
    ...(existing?.shortNames ? { shortNames: existing.shortNames } : {}),
    acceptedNames:
      existing?.acceptedNames ?? generatedAcceptedNames(country, feature),
    continent: country.continent,
    subregion: feature.properties.SUBREGION,
    capital: buildCapital(existing, cityCapital),
    assets: {
      flagUrl: '',
    },
    eligibility,
    difficulty,
    status: 'active',
    sourceRevision: inputs.sourceRevision,
  }
}

export const buildGameCountries = ({
  countries,
  countryCodes,
  sourceLock,
  countryDifficultyDocument,
  overrideDocument,
  cityById,
}: {
  countries: GeneratedCountryCorpusRecord[]
  countryCodes: string[]
  sourceLock: CorpusSourceLock
  countryDifficultyDocument: CountryDifficultyDocument
  overrideDocument: CityOverrideDocument
  cityById: Map<number, GeneratedCityRecord>
}): CountryRecord[] => {
  const reviewedByCode = loadReviewedCountries()
  const naturalEarthByCode = loadNaturalEarthFeatures(sourceLock, countryCodes)
  const rosterCodes = new Set(countries.map((country) => country.code))
  const editorialDifficultyByCode = editorialDifficulties(
    countryDifficultyDocument,
    rosterCodes,
  )
  for (const country of countries) {
    assert(
      editorialDifficultyByCode.has(country.code),
      `${country.code} is missing from the country-difficulty table`,
    )
  }
  const shapeHeldCodes = shapeHoldCodes(countryDifficultyDocument, rosterCodes)
  const capitalReviewCodes = new Set(
    overrideDocument.reviewQueue
      .filter((review) => review.topic.includes('capital'))
      .map((review) => review.countryCode),
  )
  return countries.map((country) =>
    toGameCountry(country, {
      feature: naturalEarthByCode.get(country.code),
      existing: reviewedByCode.get(country.code),
      editorialDifficulty:
        editorialDifficultyByCode.get(country.code) ??
        fail(`${country.code} has no editorial difficulty`),
      shapeHeld: shapeHeldCodes.has(country.code),
      capitalEligible: !capitalReviewCodes.has(country.code),
      cityById,
      sourceRevision: sourceLock.sourceRevision,
    }),
  )
}
