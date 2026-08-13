import { groupBy } from 'es-toolkit'
import { buildCityAutocompleteOptions } from '../../app/meridian/city-options.ts'
import type {
  GeneratedCityCorpus,
  GeneratedCityRecord,
} from '../../app/meridian/corpus-model.ts'
import type { CountryRecord, RoundType } from '../../app/meridian/model.ts'
import {
  normalizeGeoAnswer,
  rankGeoAutocompleteCandidates,
} from './lib-text-answer.ts'
import {
  check,
  isCoordinateWithin,
  isLocalizedText,
} from './lib-validate-core.ts'
import type {
  AssetManifest,
  Challenge,
  CityOverrides,
  CorpusSourceLock,
  CountryCorpus,
  GenerationApproval,
  SourceLock,
} from './lib-validate-types.ts'

type CityOption = NonNullable<Challenge['cityOptions']>[number]
type Locale = 'en' | 'es'

type CorpusValidationContext = {
  challenge: Challenge
  corpus: CountryCorpus
  cityCorpus: GeneratedCityCorpus
  manifest: AssetManifest
  approval: GenerationApproval
  sourceLock: SourceLock
  corpusSourceLock: CorpusSourceLock
  cityOverrides: CityOverrides
  countryByCode: Map<string, CountryRecord>
  eligibleCountriesByRound: Map<RoundType, Map<string, CountryRecord>>
  expectedRoundTypes: readonly RoundType[]
  difficulties: readonly number[]
}

type CorpusDerivations = {
  cityByGeonamesId: Map<number, GeneratedCityRecord>
  eligibleMapCities: GeneratedCityRecord[]
  eligibleMapCityIds: Set<number>
}

export const validateCorpusDocuments = (
  context: CorpusValidationContext,
): CorpusDerivations => {
  const cityByGeonamesId = new Map(
    context.cityCorpus.cities.map((city) => [city.geonamesId, city]),
  )
  validateCityAutocomplete(context)
  const eligibleMapCountries =
    context.eligibleCountriesByRound.get('map') ??
    new Map<string, CountryRecord>()
  const eligibleMapCities = context.cityCorpus.cities.filter((city) =>
    eligibleMapCountries.has(city.countryCode),
  )
  const eligibleMapCityIds = new Set(
    eligibleMapCities.map((city) => city.geonamesId),
  )
  validateDocumentRevisions(context)
  validateCorpusUniqueness(context, cityByGeonamesId)
  validateCityRecords(context)
  validateCapitalRetention(eligibleMapCountries, eligibleMapCities)
  validateCountryRecords(context)
  validateEditorialHolds(context)
  return { cityByGeonamesId, eligibleMapCities, eligibleMapCityIds }
}

const validateCityAutocomplete = (context: CorpusValidationContext): void => {
  const { challenge, cityCorpus } = context
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
    validateLabelAmbiguity(cityOptions, locale)
  }
}

const validateLabelAmbiguity = (
  cityOptions: readonly CityOption[],
  locale: Locale,
): void => {
  const optionsByLabel = groupBy(cityOptions, (option) =>
    normalizeGeoAnswer(option.label[locale], locale),
  )
  for (const [normalizedCityLabel, labelOptions] of Object.entries(
    optionsByLabel,
  )) {
    validateLabelResolution({
      normalizedCityLabel,
      labelOptions,
      cityOptions,
      locale,
    })
  }
}

const validateLabelResolution = ({
  normalizedCityLabel,
  labelOptions,
  cityOptions,
  locale,
}: {
  normalizedCityLabel: string
  labelOptions: readonly CityOption[]
  cityOptions: readonly CityOption[]
  locale: Locale
}): void => {
  const optionIds = labelOptions.map((option) => option.id)
  const matches = rankGeoAutocompleteCandidates(
    normalizedCityLabel,
    cityOptions,
    locale,
    { minimumCharacters: 1, maxResults: cityOptions.length },
  )
  const exactMatches = matches.filter(
    (candidate) => candidate.normalizedLabel === normalizedCityLabel,
  )
  if (optionIds.length === 1) {
    check(
      exactMatches.length === 1 && exactMatches[0]?.optionId === optionIds[0],
      `Unique ${locale} city label "${normalizedCityLabel}" is not resolvable`,
    )
    return
  }
  check(
    exactMatches.length === 0,
    `Ambiguous ${locale} city label "${normalizedCityLabel}" must not autocomplete`,
  )
}

const validateDocumentRevisions = (context: CorpusValidationContext): void => {
  const { challenge, corpus, cityCorpus, manifest, approval } = context
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
      challenge.sourceRevision === context.sourceLock.sourceRevision,
    'Country source revisions must match across challenge, corpus, assets, approval, and lock',
  )
  check(
    cityCorpus.sourceRevision === context.corpusSourceLock.sourceRevision,
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
}

const validateCorpusUniqueness = (
  context: CorpusValidationContext,
  cityByGeonamesId: Map<number, GeneratedCityRecord>,
): void => {
  check(
    new Set(context.corpus.countries.map(({ code }) => code)).size ===
      context.corpus.countries.length,
    'Country corpus contains duplicate ISO alpha-2 codes',
  )
  check(
    cityByGeonamesId.size === context.cityCorpus.cities.length,
    'City corpus contains duplicate GeoNames IDs',
  )
}

const validateCityRecords = (context: CorpusValidationContext): void => {
  for (const city of context.cityCorpus.cities) {
    check(
      city.sourceRevision === context.cityCorpus.sourceRevision,
      `City ${city.geonamesId} uses a stale source revision`,
    )
    check(
      context.countryByCode.has(city.countryCode),
      `City ${city.geonamesId} references unknown country ${city.countryCode}`,
    )
    check(
      isLocalizedText(city.names),
      `City ${city.geonamesId} lacks EN/ES names`,
    )
    check(
      isCoordinateWithin(city.latitude, 90) &&
        isCoordinateWithin(city.longitude, 180),
      `City ${city.geonamesId} has invalid coordinates`,
    )
    check(
      context.difficulties.includes(city.difficulty),
      `City ${city.geonamesId} has invalid difficulty`,
    )
  }
}

const validateCapitalRetention = (
  eligibleMapCountries: Map<string, CountryRecord>,
  eligibleMapCities: readonly GeneratedCityRecord[],
): void => {
  for (const country of eligibleMapCountries.values()) {
    check(
      eligibleMapCities.some(
        (city) => city.isCapital && city.countryCode === country.code,
      ),
      `${country.code} has no retained capital city`,
    )
  }
}

const validateCountryRecords = (context: CorpusValidationContext): void => {
  for (const country of context.corpus.countries) {
    check(isLocalizedText(country.names), `${country.code} lacks EN/ES names`)
    check(
      isLocalizedText(country.capital.names),
      `${country.code} capital lacks EN/ES names`,
    )
    check(
      isCoordinateWithin(country.capital.latitude, 90) &&
        isCoordinateWithin(country.capital.longitude, 180),
      `${country.code} has invalid capital coordinates`,
    )
    for (const roundType of context.expectedRoundTypes) {
      const roundDifficulty = country.difficulty[roundType]
      check(
        country.eligibility[roundType] ===
          (roundDifficulty !== undefined &&
            context.difficulties.includes(roundDifficulty)),
        `${country.code} ${roundType} eligibility and difficulty disagree`,
      )
    }
    validateCountryAssets(country, context.manifest)
  }
}

const validateCountryAssets = (
  country: CountryRecord,
  manifest: AssetManifest,
): void => {
  if (country.status !== 'active') return
  if (country.eligibility.shape) {
    check(
      country.assets.shapeUrl === manifest.shapes[country.code]?.url,
      `${country.code} shape asset differs between corpus and manifest`,
    )
  }
  if (country.eligibility.flag) {
    check(
      country.assets.flagUrl === manifest.flags[country.code]?.url,
      `${country.code} flag asset differs between corpus and manifest`,
    )
  }
}

const validateEditorialHolds = (context: CorpusValidationContext): void => {
  const { cityOverrides, countryByCode } = context
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
}
