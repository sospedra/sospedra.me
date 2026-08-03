import type {
  CityAutocompleteOption,
  CityAutocompleteOptionId,
  LocalizedOption,
  LocalizedText,
} from './model'

export interface CityAutocompleteSource {
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

export const mergeCapitalAutocompleteOptions = (
  cityOptions: readonly CityAutocompleteOption[],
  answerOptions: readonly LocalizedOption[],
): LocalizedOption[] => {
  const optionsById = new Map<string, LocalizedOption>(
    cityOptions.map((option) => [option.id, option]),
  )
  for (const option of answerOptions) optionsById.set(option.id, option)
  return [...optionsById.values()]
}
