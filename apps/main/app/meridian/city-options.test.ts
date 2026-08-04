import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCityAutocompleteOptions,
  cityAutocompleteOptionId,
  mergeCapitalAutocompleteOptions,
} from './city-options.ts'

const madrid = {
  geonamesId: 3117735,
  countryCode: 'ES',
  names: { en: 'Madrid', es: 'Madrid' },
  isCapital: true,
}

const valencia = {
  geonamesId: 2509954,
  countryCode: 'ES',
  names: { en: 'Valencia', es: 'Valencia' },
  isCapital: false,
}

test('capitals and plain cities use distinct id shapes', () => {
  assert.equal(cityAutocompleteOptionId(madrid), 'capital-es')
  assert.equal(cityAutocompleteOptionId(valencia), 'city-es-2509954')
})

test('autocomplete options copy their labels', () => {
  const options = buildCityAutocompleteOptions([madrid, valencia])
  assert.deepEqual(options, [
    { id: 'capital-es', label: { en: 'Madrid', es: 'Madrid' } },
    { id: 'city-es-2509954', label: { en: 'Valencia', es: 'Valencia' } },
  ])
  assert.notStrictEqual(options[0].label, madrid.names)
})

test('answer options override city entries with the same id', () => {
  const cityOptions = buildCityAutocompleteOptions([madrid, valencia])
  const merged = mergeCapitalAutocompleteOptions(cityOptions, [
    { id: 'capital-es', label: { en: 'Madrid (official)', es: 'Madrid' } },
    { id: 'capital-fr', label: { en: 'Paris', es: 'París' } },
  ])
  assert.equal(merged.length, 3)
  assert.equal(
    merged.find((option) => option.id === 'capital-es')?.label.en,
    'Madrid (official)',
  )
  assert.ok(merged.some((option) => option.id === 'capital-fr'))
  assert.ok(merged.some((option) => option.id === 'city-es-2509954'))
})
