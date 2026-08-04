import { flag } from 'country-emoji'

export const createFlag = (name: string) => {
  switch (name) {
    case 'ROC':
      return '🇷🇺'
    case 'Republic of Korea':
      return '🇰🇷'
    case 'Great Britain':
      return '🇬🇧'
    case 'Chinese Taipei':
      return '🇹🇼'
    case 'Hong Kong, China':
      return '🇭🇰'
    case "Côte d'Ivoire":
      return '🇨🇮'
    default:
      return flag(name)
  }
}
