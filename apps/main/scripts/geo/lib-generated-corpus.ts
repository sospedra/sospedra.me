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

const pickDisplayName = (names: AlternateName[], fallback: string) => {
  const eligible = [...names].sort(
    (a, b) =>
      Number(b.preferred) - Number(a.preferred) ||
      Number(b.short) - Number(a.short) ||
      a.id - b.id,
  )
  return eligible[0]?.name || fallback
}

export const collectAlternateNames = async ({
  sourceLock,
  selectedById,
}: {
  sourceLock: CorpusSourceLock
  selectedById: Map<number, CityCandidate>
}): Promise<Map<number, AlternateNames>> => {
  const selectedIdSet = new Set(selectedById.keys())
  const alternateNames = new Map<number, AlternateNames>()
  await streamArchiveLines(sourceLock.geonames.files.alternateNames, (line) => {
    const fields = line.split('\t')
    const geonamesId = Number(fields[1])
    if (!selectedIdSet.has(geonamesId)) return
    const language = fields[2]
    if (language === 'wkdt') {
      const wikidataId = normalizedCurrentName(fields[3] ?? '')
      assert(
        /^Q\d+$/u.test(wikidataId),
        `GeoNames city ${geonamesId} has invalid Wikidata id ${wikidataId}`,
      )
      const names = alternateNames.get(geonamesId) ?? { en: [], es: [] }
      names.wikidataId = wikidataId
      alternateNames.set(geonamesId, names)
      return
    }
    if (language !== 'en' && language !== 'es') return
    const name = normalizedCurrentName(fields[3] ?? '')
    const colloquial = fields[6] === '1'
    const historic = fields[7] === '1'
    const ended = Boolean(fields[9])
    if (!name || colloquial || historic || ended) return

    const names = alternateNames.get(geonamesId) ?? { en: [], es: [] }
    names[language].push({
      id: Number(fields[0]) || Number.MAX_SAFE_INTEGER,
      name,
      preferred: fields[4] === '1',
      short: fields[5] === '1',
    })
    alternateNames.set(geonamesId, names)
  })
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
      (a, b) => b.population - a.population || a.geonamesId - b.geonamesId,
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

export const buildCityRecords = ({
  selectedById,
  alternateNames,
  rankByCountry,
  overridesById,
  policy,
  sourceLock,
}: {
  selectedById: Map<number, CityCandidate>
  alternateNames: Map<number, AlternateNames>
  rankByCountry: Map<string, Map<number, number>>
  overridesById: Partial<Record<number, CityOverrideAction[]>>
  policy: CoveragePolicy
  sourceLock: CorpusSourceLock
}): GeneratedCityRecord[] => {
  const cities: GeneratedCityRecord[] = [...selectedById.values()]
    .map((candidate) => {
      const alternate = alternateNames.get(candidate.geonamesId) ?? {
        en: [],
        es: [],
      }
      const enName = pickDisplayName(alternate.en, candidate.name)
      const esName = pickDisplayName(alternate.es, candidate.name)
      const names: LocalizedText = { en: enName, es: esName }
      const namesOverride = overridesById[candidate.geonamesId]?.find(
        (override) => override.action === 'names',
      )
      if (namesOverride?.action === 'names') {
        Object.assign(names, namesOverride.names)
      }

      const populationRank =
        rankByCountry.get(candidate.countryCode)?.get(candidate.geonamesId) ??
        fail(`Population rank is missing for ${candidate.geonamesId}`)
      const acceptedNames = {
        en: uniqueNames(enName, [
          candidate.name,
          candidate.asciiName,
          ...alternate.en.map((name) => name.name),
          ...(namesOverride?.action === 'names'
            ? (namesOverride.acceptedNames?.en ?? [])
            : []),
        ]),
        es: uniqueNames(esName, [
          candidate.name,
          candidate.asciiName,
          ...alternate.es.map((name) => name.name),
          ...(namesOverride?.action === 'names'
            ? (namesOverride.acceptedNames?.es ?? [])
            : []),
        ]),
      }

      return {
        geonamesId: candidate.geonamesId,
        ...(alternate.wikidataId ? { wikidataId: alternate.wikidataId } : {}),
        countryCode: candidate.countryCode,
        names,
        acceptedNames,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        population: candidate.population,
        populationRank,
        featureCode: candidate.featureCode,
        isCapital: candidate.isCapital,
        difficulty: cityDifficulty(populationRank, candidate.isCapital, policy),
        sourceRevision: sourceLock.sourceRevision,
      }
    })
    .sort(
      (a, b) =>
        compareText(a.countryCode, b.countryCode) ||
        a.populationRank - b.populationRank ||
        a.geonamesId - b.geonamesId,
    )
  return cities
}

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
      (a, b) =>
        (cityById.get(a)?.populationRank ?? Number.MAX_SAFE_INTEGER) -
          (cityById.get(b)?.populationRank ?? Number.MAX_SAFE_INTEGER) || a - b,
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
