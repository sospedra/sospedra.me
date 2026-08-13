import type {
  CityAutocompleteOption,
  CityAutocompleteOptionId,
  LocalizedText,
} from './model'

export type CityAutocompleteSource = {
  geonamesId: number
  countryCode: string
  names: LocalizedText
  isCapital: boolean
}

export const cityAutocompleteOptionId = ({
  countryCode,
  geonamesId,
  isCapital,
}: CityAutocompleteSource): CityAutocompleteOptionId => {
  const code = countryCode.toLocaleLowerCase('en')
  return isCapital ? `capital-${code}` : `city-${code}-${geonamesId}`
}

export const buildCityAutocompleteOptions = (
  cities: readonly CityAutocompleteSource[],
): CityAutocompleteOption[] =>
  cities.map((city) => ({
    id: cityAutocompleteOptionId(city),
    label: { ...city.names },
  }))
