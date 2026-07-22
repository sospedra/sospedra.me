export type Region = 'americas' | 'europe' | 'africa' | 'asia'

export type Destination = {
  code: string
  name: string
  country: string
  region: Region
  lat: number
  lon: number
  home?: boolean
}

export type Visitor = {
  lat: number
  lon: number
  city: string | null
  country: string | null
}

export type FlagPalette = readonly [primary: string, secondary: string]

const COUNTRY_FLAG_PALETTES: Record<string, FlagPalette> = {
  AD: ['#4f7de5', '#ffd447'],
  AT: ['#ef5360', '#f6f1dc'],
  DE: ['#ffd447', '#ef5360'],
  DO: ['#4f7de5', '#ef5360'],
  ES: ['#ffd447', '#ef4d5e'],
  FR: ['#4f7de5', '#ef5360'],
  GB: ['#ef5360', '#7ba6ff'],
  HU: ['#ef5360', '#46b978'],
  IT: ['#39c78b', '#ef5360'],
  JP: ['#ef4f6c', '#f6f1dc'],
  MA: ['#ef4d5e', '#39c78b'],
  NL: ['#ef5360', '#4f7de5'],
  NO: ['#ef5360', '#4f7de5'],
  PT: ['#39c78b', '#ef4d5e'],
  SE: ['#4f8cff', '#ffd447'],
  TZ: ['#2fbcae', '#ffd447'],
  US: ['#ef5360', '#7ba6ff'],
}

export const flagPaletteOf = (country: string): FlagPalette =>
  COUNTRY_FLAG_PALETTES[country] ?? ['#6df7ea', '#ff4fd8']

export const REGIONS: { id: Region; label: string }[] = [
  { id: 'americas', label: 'Americas' },
  { id: 'europe', label: 'Europe' },
  { id: 'africa', label: 'Africa' },
  { id: 'asia', label: 'Asia' },
]

// ISO country code to regional-indicator emoji
export const flagOf = (country: string): string =>
  String.fromCodePoint(...[...country].map((c) => 127397 + c.charCodeAt(0)))

export const HOME: Destination = {
  code: 'CAT',
  name: 'Catalunya',
  country: 'ES',
  region: 'europe',
  lat: 41.39,
  lon: 2.17,
  home: true,
}

export const DESTINATIONS: Destination[] = [
  {
    code: 'LAX',
    name: 'Los Angeles',
    country: 'US',
    region: 'americas',
    lat: 34.05,
    lon: -118.24,
  },
  {
    code: 'CHI',
    name: 'Chicago',
    country: 'US',
    region: 'americas',
    lat: 41.88,
    lon: -87.63,
  },
  {
    code: 'MIA',
    name: 'Miami',
    country: 'US',
    region: 'americas',
    lat: 25.76,
    lon: -80.19,
  },
  {
    code: 'SDQ',
    name: 'Santo Domingo',
    country: 'DO',
    region: 'americas',
    lat: 18.47,
    lon: -69.93,
  },
  {
    code: 'LON',
    name: 'London',
    country: 'GB',
    region: 'europe',
    lat: 51.51,
    lon: -0.13,
  },
  {
    code: 'EDI',
    name: 'Edinburgh',
    country: 'GB',
    region: 'europe',
    lat: 55.95,
    lon: -3.19,
  },
  {
    code: 'MAD',
    name: 'Spain',
    country: 'ES',
    region: 'europe',
    lat: 40.42,
    lon: -3.7,
  },
  HOME,
  {
    code: 'FNC',
    name: 'Madeira',
    country: 'PT',
    region: 'europe',
    lat: 32.65,
    lon: -16.91,
  },
  {
    code: 'LIS',
    name: 'Lisbon',
    country: 'PT',
    region: 'europe',
    lat: 38.72,
    lon: -9.14,
  },
  {
    code: 'PAR',
    name: 'Paris',
    country: 'FR',
    region: 'europe',
    lat: 48.86,
    lon: 2.35,
  },
  {
    code: 'BER',
    name: 'Berlin',
    country: 'DE',
    region: 'europe',
    lat: 52.52,
    lon: 13.4,
  },
  {
    code: 'HAM',
    name: 'Hamburg',
    country: 'DE',
    region: 'europe',
    lat: 53.55,
    lon: 9.99,
  },
  {
    code: 'AMS',
    name: 'Amsterdam',
    country: 'NL',
    region: 'europe',
    lat: 52.37,
    lon: 4.9,
  },
  {
    code: 'TOS',
    name: 'Tromsø',
    country: 'NO',
    region: 'europe',
    lat: 69.65,
    lon: 18.96,
  },
  {
    code: 'STO',
    name: 'Stockholm',
    country: 'SE',
    region: 'europe',
    lat: 59.33,
    lon: 18.06,
  },
  {
    code: 'VIE',
    name: 'Vienna',
    country: 'AT',
    region: 'europe',
    lat: 48.21,
    lon: 16.37,
  },
  {
    code: 'ROM',
    name: 'Roma',
    country: 'IT',
    region: 'europe',
    lat: 41.9,
    lon: 12.5,
  },
  {
    code: 'TRN',
    name: 'Torino',
    country: 'IT',
    region: 'europe',
    lat: 45.07,
    lon: 7.69,
  },
  {
    code: 'BUD',
    name: 'Budapest',
    country: 'HU',
    region: 'europe',
    lat: 47.5,
    lon: 19.04,
  },
  {
    code: 'AND',
    name: 'Andorra',
    country: 'AD',
    region: 'europe',
    lat: 42.51,
    lon: 1.52,
  },
  {
    code: 'RAK',
    name: 'Marrakesh',
    country: 'MA',
    region: 'africa',
    lat: 31.63,
    lon: -7.99,
  },
  {
    code: 'SEU',
    name: 'Serengeti',
    country: 'TZ',
    region: 'africa',
    lat: -2.33,
    lon: 34.83,
  },
  {
    code: 'ZNZ',
    name: 'Zanzibar',
    country: 'TZ',
    region: 'africa',
    lat: -6.16,
    lon: 39.19,
  },
  {
    code: 'OSA',
    name: 'Osaka',
    country: 'JP',
    region: 'asia',
    lat: 34.69,
    lon: 135.5,
  },
  {
    code: 'KYO',
    name: 'Kyoto',
    country: 'JP',
    region: 'asia',
    lat: 35.01,
    lon: 135.77,
  },
  {
    code: 'TYO',
    name: 'Tokyo',
    country: 'JP',
    region: 'asia',
    lat: 35.68,
    lon: 139.69,
  },
  {
    code: 'HIJ',
    name: 'Hiroshima',
    country: 'JP',
    region: 'asia',
    lat: 34.39,
    lon: 132.46,
  },
  {
    code: 'TAK',
    name: 'Takayama',
    country: 'JP',
    region: 'asia',
    lat: 36.14,
    lon: 137.25,
  },
]
