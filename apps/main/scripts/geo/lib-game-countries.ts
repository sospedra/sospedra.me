import { existsSync } from 'node:fs'
import { sumBy } from 'es-toolkit'
import { filter, map, pipe } from 'es-toolkit/fp'
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

const naturalEarthFeatureScore = (
  code: string,
  feature: NaturalEarthFeature,
) => {
  const properties = feature.properties
  const typeScore: Record<string, number> = {
    'Sovereign country': 5,
    Country: 4,
    Sovereignty: 3,
    Indeterminate: 2,
  }
  return (
    (properties.ISO_A2 === code ? 100 : 0) +
    (properties.ISO_A2_EH === code ? 10 : 0) +
    (typeScore[properties.TYPE ?? ''] ?? 0)
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
      (a, b) =>
        naturalEarthFeatureScore(code, b) - naturalEarthFeatureScore(code, a) ||
        compareText(JSON.stringify(a.properties), JSON.stringify(b.properties)),
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
  const existingCountryCorpus = readJson<ExistingCountryCorpus>(
    'repo/geo/generated/countries.json',
  )
  const reviewedByCode = pipe(
    existingCountryCorpus.countries,
    filter((country) => LEGACY_REVIEWED_COUNTRY_CODES.has(country.code)),
    map((country) => [country.code, country] as const),
    (entries) => new Map(entries),
  )
  const naturalEarth = readJson<NaturalEarthDocument>(
    sourceLock.naturalEarth.file.path,
  )
  assert(
    naturalEarth.type === 'FeatureCollection' &&
      Array.isArray(naturalEarth.features),
    'Natural Earth countries must be a GeoJSON FeatureCollection',
  )
  const naturalEarthByCode = new Map(
    countryCodes.map((code) => [
      code,
      primaryNaturalEarthFeature(code, naturalEarth.features),
    ]),
  )
  assert(
    countryDifficultyDocument.schemaVersion === 1,
    'Unsupported country-difficulty schema',
  )
  assert(
    countryDifficultyDocument.revision.trim().length > 0,
    'Country-difficulty table must declare a revision',
  )
  const editorialTierEntries = Object.entries(countryDifficultyDocument.tiers)
  const rosterCodes = new Set(countries.map((country) => country.code))
  for (const [code, tier] of editorialTierEntries) {
    assert(
      rosterCodes.has(code),
      `Country-difficulty table tiers unknown country ${code}`,
    )
    assert(
      tier === 1 || tier === 2 || tier === 3 || tier === 4,
      `${code} has an invalid editorial difficulty tier`,
    )
  }
  const editorialDifficultyByCode = new Map<string, Difficulty>(
    editorialTierEntries,
  )
  for (const country of countries) {
    assert(
      editorialDifficultyByCode.has(country.code),
      `${country.code} is missing from the country-difficulty table`,
    )
  }
  const shapeHeldCodes = new Set(countryDifficultyDocument.shapeHolds ?? [])
  for (const code of shapeHeldCodes) {
    assert(
      rosterCodes.has(code),
      `Country-difficulty shape hold references unknown country ${code}`,
    )
  }
  const capitalReviewCodes = pipe(
    overrideDocument.reviewQueue,
    filter((review) => review.topic.includes('capital')),
    map((review) => review.countryCode),
    (codes) => new Set(codes),
  )

  const gameCountries: CountryRecord[] = countries.map((country) => {
    const feature = naturalEarthByCode.get(country.code)
    const existing = reviewedByCode.get(country.code)
    const capitalIds = country.capitalCityIds
    assert(
      capitalIds.length === 1,
      `${country.code} must resolve to exactly one canonical capital; additional capital roles require an explicit game-model change`,
    )
    const cityCapital = cityById.get(capitalIds[0] as number)
    assert(cityCapital, `${country.code} canonical capital is missing`)
    const countryWikidataId = validSourceName(feature?.properties.WIKIDATAID)
    const editorialDifficulty =
      editorialDifficultyByCode.get(country.code) ??
      fail(`${country.code} has no editorial difficulty`)
    const shapeEligible = hasRobustCountryGeometry(feature)
    const flagEligible = existsSync(
      pathFromRoot(
        `node_modules/flag-icons/flags/4x3/${country.code.toLocaleLowerCase('en')}.svg`,
      ),
    )
    const capitalEligible = !capitalReviewCodes.has(country.code)
    const baseEligibility = existing?.eligibility ?? {
      shape: shapeEligible,
      flag: flagEligible,
      capital: capitalEligible,
      map: capitalEligible,
    }
    const eligibility = shapeHeldCodes.has(country.code)
      ? { ...baseEligibility, shape: false }
      : baseEligibility
    assert(
      !eligibility.shape || shapeEligible,
      `${country.code} cannot be shape-eligible without robust Natural Earth geometry`,
    )
    assert(
      !eligibility.flag || flagEligible,
      `${country.code} cannot be flag-eligible without a flag-icons asset`,
    )

    // The editorial recognizability table is the single difficulty source;
    // legacy per-country reviews keep names and eligibility only.
    const difficulty: CountryDifficulty = {
      ...(eligibility.shape ? { shape: editorialDifficulty } : {}),
      ...(eligibility.flag ? { flag: editorialDifficulty } : {}),
      ...(eligibility.capital ? { capital: editorialDifficulty } : {}),
      ...(eligibility.map ? { map: editorialDifficulty } : {}),
    }
    const naturalEarthNames = [
      feature?.properties.NAME_EN,
      feature?.properties.NAME_ES,
      feature?.properties.NAME_LONG,
      feature?.properties.FORMAL_EN,
    ].map(validSourceName)
    const acceptedNames = existing?.acceptedNames ?? {
      en: uniqueNames(country.names.en, [
        naturalEarthNames[0] ?? '',
        naturalEarthNames[2] ?? '',
        naturalEarthNames[3] ?? '',
      ]),
      es: uniqueNames(country.names.es, [naturalEarthNames[1] ?? '']),
    }
    const generatedCapital = {
      ...(cityCapital.wikidataId ? { wikidataId: cityCapital.wikidataId } : {}),
      geonamesId: cityCapital.geonamesId,
      names: cityCapital.names,
      acceptedNames: cityCapital.acceptedNames,
      latitude: cityCapital.latitude,
      longitude: cityCapital.longitude,
    }

    assert(
      countryWikidataId,
      `${country.code} has no Natural Earth Wikidata id`,
    )
    assert(
      feature?.properties.SUBREGION,
      `${country.code} has no Natural Earth subregion`,
    )
    assert(
      !feature?.properties.ISO_A3_EH ||
        feature.properties.ISO_A3_EH === country.iso3,
      `${country.code} has mismatched GeoNames and Natural Earth ISO3 codes`,
    )

    return {
      code: country.code,
      iso3: country.iso3,
      wikidataId: existing?.wikidataId ?? countryWikidataId,
      names: existing?.names ?? country.names,
      ...(existing?.shortNames ? { shortNames: existing.shortNames } : {}),
      acceptedNames,
      continent: country.continent,
      subregion: feature.properties.SUBREGION,
      capital: existing
        ? {
            ...existing.capital,
            geonamesId: cityCapital.geonamesId,
            acceptedNames: cityCapital.acceptedNames,
          }
        : generatedCapital,
      assets: {
        flagUrl: '',
      },
      eligibility,
      difficulty,
      status: 'active',
      sourceRevision: sourceLock.sourceRevision,
    }
  })
  return gameCountries
}
