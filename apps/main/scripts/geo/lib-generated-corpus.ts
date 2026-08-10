import type {
  CityOverrideAction,
  GeneratedCityRecord,
  GeneratedCountryCorpusRecord,
} from '../../app/meridian/corpus-model.ts'
import type { LocalizedText } from '../../app/meridian/model.ts'
import { cityDifficulty } from './lib-city-candidates.ts'
import {
  assert,
  compareText,
  fail,
  normalizedCurrentName,
  uniqueNames,
} from './lib-corpus-primitives.ts'
import type {
  AlternateName,
  AlternateNames,
  CityCandidate,
  CorpusSourceLock,
  CountryBucket,
  CountryInfo,
  CoveragePolicy,
  WorldBankPopulation,
} from './lib-corpus-types.ts'
import { streamArchiveLines } from './lib-source-verification.ts'

const WIKIDATA_ID = /^Q\d+$/u

type Locale = 'en' | 'es'

type NamesOverride = Extract<CityOverrideAction, { action: 'names' }>

type AlternateNameEvent =
  | { kind: 'skip' }
  | { kind: 'wikidata'; geonamesId: number; wikidataId: string }
  | {
      kind: 'name'
      geonamesId: number
      language: Locale
      name: AlternateName
    }

const pickDisplayName = (names: AlternateName[], fallback: string) => {
  const eligible = [...names].sort(
    (left, right) =>
      Number(right.preferred) - Number(left.preferred) ||
      Number(right.short) - Number(left.short) ||
      left.id - right.id,
  )
  return eligible[0]?.name || fallback
}

const parseAlternateNameLine = (
  line: string,
  selectedIds: ReadonlySet<number>,
): AlternateNameEvent => {
  const fields = line.split('\t')
  const geonamesId = Number(fields[1])
  if (!selectedIds.has(geonamesId)) return { kind: 'skip' }
  const language = fields[2]
  if (language === 'wkdt') {
    const wikidataId = normalizedCurrentName(fields[3] ?? '')
    assert(
      WIKIDATA_ID.test(wikidataId),
      `GeoNames city ${geonamesId} has invalid Wikidata id ${wikidataId}`,
    )
    return { kind: 'wikidata', geonamesId, wikidataId }
  }
  if (language !== 'en' && language !== 'es') return { kind: 'skip' }
  const name = normalizedCurrentName(fields[3] ?? '')
  const colloquial = fields[6] === '1'
  const historic = fields[7] === '1'
  const ended = Boolean(fields[9])
  if (!name || colloquial || historic || ended) return { kind: 'skip' }
  return {
    kind: 'name',
    geonamesId,
    language,
    name: {
      id: Number(fields[0]) || Number.MAX_SAFE_INTEGER,
      name,
      preferred: fields[4] === '1',
      short: fields[5] === '1',
    },
  }
}

const applyAlternateNameEvent = (
  alternateNames: Map<number, AlternateNames>,
  event: AlternateNameEvent,
): void => {
  if (event.kind === 'skip') return
  const names = alternateNames.get(event.geonamesId) ?? { en: [], es: [] }
  if (event.kind === 'wikidata') names.wikidataId = event.wikidataId
  if (event.kind === 'name') names[event.language].push(event.name)
  alternateNames.set(event.geonamesId, names)
}

export const collectAlternateNames = async ({
  sourceLock,
  selectedById,
}: {
  sourceLock: CorpusSourceLock
  selectedById: Map<number, CityCandidate>
}): Promise<Map<number, AlternateNames>> => {
  const selectedIds = new Set(selectedById.keys())
  const alternateNames = new Map<number, AlternateNames>()
  await streamArchiveLines(sourceLock.geonames.files.alternateNames, (line) =>
    applyAlternateNameEvent(
      alternateNames,
      parseAlternateNameLine(line, selectedIds),
    ),
  )
  return alternateNames
}

export const rankCitiesByPopulation = ({
  countryCodes,
  buckets,
}: {
  countryCodes: string[]
  buckets: Map<string, CountryBucket>
}): Map<string, Map<number, number>> => {
  const rankByCountry = new Map<string, Map<number, number>>()
  for (const countryCode of countryCodes) {
    const bucket = buckets.get(countryCode)
    assert(bucket, `City bucket is missing ${countryCode}`)
    bucket.rankBasis.sort(
      (left, right) =>
        right.population - left.population ||
        left.geonamesId - right.geonamesId,
    )
    rankByCountry.set(
      countryCode,
      new Map(
        bucket.rankBasis.map((candidate, index) => [
          candidate.geonamesId,
          index + 1,
        ]),
      ),
    )
  }
  return rankByCountry
}

const findNamesOverride = (
  overrides: readonly CityOverrideAction[] | undefined,
): NamesOverride | undefined =>
  overrides?.find(
    (override): override is NamesOverride => override.action === 'names',
  )

type CityRecordInputs = {
  alternateNames: Map<number, AlternateNames>
  rankByCountry: Map<string, Map<number, number>>
  overridesById: Partial<Record<number, CityOverrideAction[]>>
  policy: CoveragePolicy
  sourceLock: CorpusSourceLock
}

const toCityRecord = (
  candidate: CityCandidate,
  inputs: CityRecordInputs,
): GeneratedCityRecord => {
  const alternate = inputs.alternateNames.get(candidate.geonamesId) ?? {
    en: [],
    es: [],
  }
  const namesOverride = findNamesOverride(
    inputs.overridesById[candidate.geonamesId],
  )
  const pickedNames: LocalizedText = {
    en: pickDisplayName(alternate.en, candidate.name),
    es: pickDisplayName(alternate.es, candidate.name),
  }
  const names = namesOverride
    ? { ...pickedNames, ...namesOverride.names }
    : pickedNames
  const acceptedNamesFor = (locale: Locale): string[] =>
    uniqueNames(pickedNames[locale], [
      candidate.name,
      candidate.asciiName,
      ...alternate[locale].map((alternateName) => alternateName.name),
      ...(namesOverride?.acceptedNames?.[locale] ?? []),
    ])
  const populationRank =
    inputs.rankByCountry
      .get(candidate.countryCode)
      ?.get(candidate.geonamesId) ??
    fail(`Population rank is missing for ${candidate.geonamesId}`)
  return {
    geonamesId: candidate.geonamesId,
    ...(alternate.wikidataId ? { wikidataId: alternate.wikidataId } : {}),
    countryCode: candidate.countryCode,
    names,
    acceptedNames: { en: acceptedNamesFor('en'), es: acceptedNamesFor('es') },
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    population: candidate.population,
    populationRank,
    featureCode: candidate.featureCode,
    isCapital: candidate.isCapital,
    difficulty: cityDifficulty(
      populationRank,
      candidate.isCapital,
      inputs.policy,
    ),
    sourceRevision: inputs.sourceLock.sourceRevision,
  }
}

export const buildCityRecords = ({
  selectedById,
  ...inputs
}: CityRecordInputs & {
  selectedById: Map<number, CityCandidate>
}): GeneratedCityRecord[] =>
  [...selectedById.values()]
    .map((candidate) => toCityRecord(candidate, inputs))
    .sort(
      (left, right) =>
        compareText(left.countryCode, right.countryCode) ||
        left.populationRank - right.populationRank ||
        left.geonamesId - right.geonamesId,
    )

export const buildCountryCorpusRecords = ({
  countryCodes,
  countryInfo,
  worldBank,
  namesByCode,
  coverageByCountry,
  selectedIdsByCountry,
  cityById,
  policy,
  sourceLock,
}: {
  countryCodes: string[]
  countryInfo: Map<string, CountryInfo>
  worldBank: Map<string, WorldBankPopulation>
  namesByCode: Map<string, LocalizedText>
  coverageByCountry: Map<string, GeneratedCountryCorpusRecord['coverage']>
  selectedIdsByCountry: Map<string, number[]>
  cityById: Map<number, GeneratedCityRecord>
  policy: CoveragePolicy
  sourceLock: CorpusSourceLock
}): GeneratedCountryCorpusRecord[] => {
  const countries: GeneratedCountryCorpusRecord[] = countryCodes.map((code) => {
    const info = countryInfo.get(code)
    const population = worldBank.get(code)
    const names = namesByCode.get(code)
    const coverage = coverageByCountry.get(code)
    const cityIds = (selectedIdsByCountry.get(code) ?? []).sort(
      (left, right) =>
        (cityById.get(left)?.populationRank ?? Number.MAX_SAFE_INTEGER) -
          (cityById.get(right)?.populationRank ?? Number.MAX_SAFE_INTEGER) ||
        left - right,
    )
    assert(info, `GeoNames countryInfo is missing ${code}`)
    assert(names, `Country names are missing ${code}`)
    assert(coverage, `City coverage is missing ${code}`)
    assert(
      /^(AF|AS|EU|NA|OC|SA)$/u.test(info.continent),
      `${code} has unsupported continent ${info.continent}`,
    )
    assert(
      !population || population.year === policy.countryPopulation.snapshotYear,
      `${code} has a World Bank population from the wrong year`,
    )
    assert(
      !population?.iso3 || population.iso3 === info.iso3,
      `${code} has mismatched GeoNames and World Bank ISO3 codes`,
    )

    return {
      code,
      iso3: info.iso3,
      names,
      continent: info.continent as GeneratedCountryCorpusRecord['continent'],
      worldBankPopulation: population?.value ?? null,
      worldBankPopulationYear: policy.countryPopulation.snapshotYear,
      capitalCityIds: cityIds.filter((id) => cityById.get(id)?.isCapital),
      cityIds,
      coverage,
      sourceRevision: sourceLock.sourceRevision,
    }
  })
  return countries
}
