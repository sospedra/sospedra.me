import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildCityAutocompleteOptions,
  type CityAutocompleteSource,
  mergeCapitalAutocompleteOptions,
} from './city-options.ts'
import type { LocalizedOption } from './model.ts'
import { rankGeoAutocompleteCandidates } from './text-answer.ts'

const options: LocalizedOption[] = [
  {
    id: 'city-us-los-angeles',
    label: { en: 'Los Angeles', es: 'Los Ángeles' },
  },
  {
    id: 'city-ec-loja',
    label: { en: 'Loja', es: 'Loja' },
  },
  {
    id: 'capital-gb',
    label: { en: 'London', es: 'Londres' },
  },
]

test('capital cities lead non-capital cities within the same match tier', () => {
  const candidates = rankGeoAutocompleteCandidates('Lo', options, 'en')

  assert.deepEqual(
    candidates.map(({ optionId }) => optionId),
    ['capital-gb', 'city-ec-loja', 'city-us-los-angeles'],
  )
})

test('match quality remains stronger than capital-city priority', () => {
  const candidates = rankGeoAutocompleteCandidates('Loja', options, 'en')

  assert.equal(candidates[0]?.optionId, 'city-ec-loja')
  assert.equal(candidates[0]?.match, 'exact')
})

test('retained city data ranks London before Los Angeles in capital autocomplete', () => {
  const cityCorpus = JSON.parse(
    readFileSync(
      new URL('../../data/geo/generated/cities.json', import.meta.url),
      'utf8',
    ),
  ) as { cities: CityAutocompleteSource[] }
  const cityOptions = buildCityAutocompleteOptions(cityCorpus.cities)
  const capitalOptions: LocalizedOption[] = [
    {
      id: 'capital-gb',
      label: { en: 'London', es: 'Londres' },
    },
  ]
  const merged = mergeCapitalAutocompleteOptions(cityOptions, capitalOptions)
  const candidates = rankGeoAutocompleteCandidates('Lo', merged, 'en', {
    maxResults: merged.length,
  })
  const londonIndex = candidates.findIndex(
    ({ optionId }) => optionId === 'capital-gb',
  )
  const losAngelesIndex = candidates.findIndex(
    ({ optionId }) => optionId === 'city-us-5368361',
  )

  assert.equal(cityOptions.length, cityCorpus.cities.length)
  assert.ok(londonIndex >= 0)
  assert.ok(losAngelesIndex >= 0)
  assert.ok(londonIndex < losAngelesIndex)
})
