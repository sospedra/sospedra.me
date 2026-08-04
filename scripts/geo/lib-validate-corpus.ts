import { groupBy } from 'es-toolkit'
import { buildCityAutocompleteOptions } from '../../app/meridian/city-options.ts'
import type {
  GeneratedCityCorpus,
  GeneratedCityRecord,
} from '../../app/meridian/corpus-model.ts'
import type { CountryRecord } from '../../app/meridian/model.ts'
import {
  normalizeGeoAnswer,
  rankGeoAutocompleteCandidates,
} from '../../app/meridian/text-answer.ts'
import { check, isLocalizedText } from './lib-validate-core.ts'
import type {
  AssetManifest,
  Challenge,
  CityOverrides,
  CorpusSourceLock,
  CountryCorpus,
  GenerationApproval,
  SourceLock,
} from './lib-validate-types.ts'

export const validateCorpusDocuments = ({
  challenge,
  corpus,
  cityCorpus,
  manifest,
  approval,
  sourceLock,
  corpusSourceLock,
  cityOverrides,
  countryByCode,
  eligibleCountriesByRound,
  expectedRoundTypes,
  difficulties,
}: {
  challenge: Challenge
  corpus: CountryCorpus
  cityCorpus: GeneratedCityCorpus
  manifest: AssetManifest
  approval: GenerationApproval
  sourceLock: SourceLock
  corpusSourceLock: CorpusSourceLock
  cityOverrides: CityOverrides
  countryByCode: Map<string, CountryRecord>
  eligibleCountriesByRound: Map<
    (typeof expectedRoundTypes)[number],
    Map<string, CountryRecord>
  >
  expectedRoundTypes: readonly ('shape' | 'flag' | 'capital' | 'map')[]
  difficulties: readonly number[]
}): {
  cityByGeonamesId: Map<number, GeneratedCityRecord>
  eligibleMapCities: GeneratedCityRecord[]
  eligibleMapCityIds: Set<number>
} => {
  const cityByGeonamesId = new Map(
    cityCorpus.cities.map((city) => [city.geonamesId, city]),
  )
  const expectedCityOptions = buildCityAutocompleteOptions(cityCorpus.cities)
  const cityOptions = Array.isArray(challenge.cityOptions)
    ? challenge.cityOptions
    : []
  check(
    Array.isArray(challenge.cityOptions),
    'Challenge must contain a city autocomplete lexicon',
  )
  check(
    cityOptions.length === expectedCityOptions.length,
    'City autocomplete lexicon must contain one option per retained city',
  )
  check(
    new Set(cityOptions.map((option) => option.id)).size === cityOptions.length,
    'City autocomplete option IDs must be unique',
  )
  for (const [index, expected] of expectedCityOptions.entries()) {
    const actual = cityOptions[index]
    check(
      actual?.id === expected.id &&
        actual?.label.en === expected.label.en &&
        actual?.label.es === expected.label.es,
      `City autocomplete option ${index + 1} differs from the retained city corpus`,
    )
  }
  for (const locale of ['en', 'es'] as const) {
    const optionsByLabel = groupBy(cityOptions, (option) =>
      normalizeGeoAnswer(option.label[locale], locale),
    )

    for (const [normalizedLabel, labelOptions] of Object.entries(
      optionsByLabel,
    )) {
      const optionIds = labelOptions.map((option) => option.id)
      const matches = rankGeoAutocompleteCandidates(
        normalizedLabel,
        cityOptions,
        locale,
        {
          minimumCharacters: 1,
          maxResults: cityOptions.length,
        },
      )
      const exactMatches = matches.filter(
        (candidate) => candidate.normalizedLabel === normalizedLabel,
      )
      check(
        optionIds.length === 1
          ? exactMatches.length === 1 &&
              exactMatches[0]?.optionId === optionIds[0]
          : exactMatches.length === 0,
        optionIds.length === 1
          ? `Unique ${locale} city label "${normalizedLabel}" is not resolvable`
          : `Ambiguous ${locale} city label "${normalizedLabel}" must not autocomplete`,
      )
    }
  }
  const eligibleMapCountries =
    eligibleCountriesByRound.get('map') ?? new Map<string, CountryRecord>()
  const eligibleMapCities = cityCorpus.cities.filter((city) =>
    eligibleMapCountries.has(city.countryCode),
  )
  const eligibleMapCityIds = new Set(
    eligibleMapCities.map((city) => city.geonamesId),
  )

  check(challenge.schemaVersion === 1, 'Challenge schemaVersion must be 1')
  check(
    /^\d{4}-\d{2}-\d{2}$/u.test(challenge.publicationDate),
    'publicationDate must use YYYY-MM-DD',
  )
  check(
    challenge.id === `geo:${challenge.publicationDate}`,
    'Challenge ID must match publicationDate',
  )
  check(
    approval.schemaVersion === 1,
    'Generation approval schemaVersion must be 1',
  )
  check(
    challenge.generatorVersion === approval.generatorVersion,
    'Challenge generatorVersion is not approved',
  )
  check(
    challenge.rulesVersion === approval.rulesVersion,
    'Challenge rulesVersion is not approved',
  )
  check(
    challenge.sourceRevision === corpus.sourceRevision &&
      challenge.sourceRevision === approval.sourceRevision &&
      challenge.sourceRevision === manifest.sourceRevision &&
      challenge.sourceRevision === sourceLock.sourceRevision,
    'Country source revisions must match across challenge, corpus, assets, approval, and lock',
  )
  check(
    cityCorpus.sourceRevision === corpusSourceLock.sourceRevision,
    'City corpus source revision must match its source lock',
  )
  check(
    cityCorpus.sourceRevision === approval.citySourceRevision,
    'City corpus source revision is not approved',
  )
  check(
    cityCorpus.policyRevision === approval.cityPolicyRevision,
    'City corpus policy revision is not approved',
  )
  check(cityCorpus.schemaVersion === 1, 'City corpus schemaVersion must be 1')
  check(
    new Set(corpus.countries.map(({ code }) => code)).size ===
      corpus.countries.length,
    'Country corpus contains duplicate ISO alpha-2 codes',
  )
  check(
    cityByGeonamesId.size === cityCorpus.cities.length,
    'City corpus contains duplicate GeoNames IDs',
  )
  for (const city of cityCorpus.cities) {
    check(
      city.sourceRevision === cityCorpus.sourceRevision,
      `City ${city.geonamesId} uses a stale source revision`,
    )
    check(
      countryByCode.has(city.countryCode),
      `City ${city.geonamesId} references unknown country ${city.countryCode}`,
    )
    check(
      isLocalizedText(city.names),
      `City ${city.geonamesId} lacks EN/ES names`,
    )
    check(
      Number.isFinite(city.latitude) &&
        city.latitude >= -90 &&
        city.latitude <= 90 &&
        Number.isFinite(city.longitude) &&
        city.longitude >= -180 &&
        city.longitude <= 180,
      `City ${city.geonamesId} has invalid coordinates`,
    )
    check(
      difficulties.includes(city.difficulty as (typeof difficulties)[number]),
      `City ${city.geonamesId} has invalid difficulty`,
    )
  }
  for (const country of eligibleMapCountries.values()) {
    check(
      eligibleMapCities.some(
        (city) => city.isCapital && city.countryCode === country.code,
      ),
      `${country.code} has no retained capital city`,
    )
  }
  for (const country of corpus.countries) {
    check(isLocalizedText(country.names), `${country.code} lacks EN/ES names`)
    check(
      isLocalizedText(country.capital.names),
      `${country.code} capital lacks EN/ES names`,
    )
    check(
      Number.isFinite(country.capital.latitude) &&
        country.capital.latitude >= -90 &&
        country.capital.latitude <= 90 &&
        Number.isFinite(country.capital.longitude) &&
        country.capital.longitude >= -180 &&
        country.capital.longitude <= 180,
      `${country.code} has invalid capital coordinates`,
    )
    for (const roundType of expectedRoundTypes) {
      check(
        country.eligibility[roundType] ===
          difficulties.includes(
            country.difficulty[roundType] as (typeof difficulties)[number],
          ),
        `${country.code} ${roundType} eligibility and difficulty disagree`,
      )
    }
    if (country.status === 'active' && country.eligibility.shape) {
      check(
        country.assets.shapeUrl === manifest.shapes[country.code]?.url,
        `${country.code} shape asset differs between corpus and manifest`,
      )
    }
    if (country.status === 'active' && country.eligibility.flag) {
      check(
        country.assets.flagUrl === manifest.flags[country.code]?.url,
        `${country.code} flag asset differs between corpus and manifest`,
      )
    }
  }
  check(
    cityOverrides.reviewQueue.length === 5 &&
      new Set(cityOverrides.reviewQueue.map(({ countryCode }) => countryCode))
        .size === 5,
    'City editorial review queue must retain five distinct country holds',
  )
  for (const hold of cityOverrides.reviewQueue) {
    const country = countryByCode.get(hold.countryCode)
    check(
      Boolean(country),
      `Editorial hold references unknown ${hold.countryCode}`,
    )
    check(
      Boolean(hold.topic.trim() && hold.reason.trim()),
      `${hold.countryCode} editorial hold lacks its rationale`,
    )
    if (country) {
      check(
        !country.eligibility.capital && !country.eligibility.map,
        `${hold.countryCode} capital/map content must remain held from play`,
      )
    }
  }

  return { cityByGeonamesId, eligibleMapCities, eligibleMapCityIds }
}
