const DIACRITICS = /\p{Diacritic}/gu

export const normalize = (input: string): string => {
  return input.toLowerCase().normalize('NFD').replace(DIACRITICS, '')
}
