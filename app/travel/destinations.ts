export type Region = 'americas' | 'europe' | 'africa' | 'asia'

export type Destination = {
  code: string
  name: string
  log: string
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
  COUNTRY_FLAG_PALETTES[country] ?? ['#62d6c3', '#e2622b']

export const REGIONS: { id: Region; label: string; freq: string }[] = [
  { id: 'americas', label: 'Americas', freq: '12.7' },
  { id: 'europe', label: 'Europe', freq: '45.3' },
  { id: 'africa', label: 'Africa', freq: '88.1' },
  { id: 'asia', label: 'Asia', freq: '103.9' },
]

const REGIONAL_INDICATOR_OFFSET = 127_397

export const flagOf = (country: string): string =>
  String.fromCodePoint(
    ...[...country].map(
      (char) => REGIONAL_INDICATOR_OFFSET + char.charCodeAt(0),
    ),
  )

export const HOME: Destination = {
  code: 'CAT',
  name: 'Catalunya',
  log: 'home is the signal the scope always finds again.',
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
    log: 'perfect light, impossible distances.',
    country: 'US',
    region: 'americas',
    lat: 34.05,
    lon: -118.24,
  },
  {
    code: 'CHI',
    name: 'Chicago',
    log: 'forgave the wind for the architecture.',
    country: 'US',
    region: 'americas',
    lat: 41.88,
    lon: -87.63,
  },
  {
    code: 'MIA',
    name: 'Miami',
    log: 'pastel walls, absolutely no indoor voice.',
    country: 'US',
    region: 'americas',
    lat: 25.76,
    lon: -80.19,
  },
  {
    code: 'SDQ',
    name: 'Santo Domingo',
    log: 'the streets kept better time than me.',
    country: 'DO',
    region: 'americas',
    lat: 18.47,
    lon: -69.93,
  },
  {
    code: 'LON',
    name: 'London',
    log: 'four seasons before lunch.',
    country: 'GB',
    region: 'europe',
    lat: 51.51,
    lon: -0.13,
  },
  {
    code: 'EDI',
    name: 'Edinburgh',
    log: 'every wrong turn found a castle.',
    country: 'GB',
    region: 'europe',
    lat: 55.95,
    lon: -3.19,
  },
  {
    code: 'MAD',
    name: 'Spain',
    log: 'no itinerary survives lunch.',
    country: 'ES',
    region: 'europe',
    lat: 40.42,
    lon: -3.7,
  },
  HOME,
  {
    code: 'FNC',
    name: 'Madeira',
    log: 'the mountains forgot when to stop growing.',
    country: 'PT',
    region: 'europe',
    lat: 32.65,
    lon: -16.91,
  },
  {
    code: 'LIS',
    name: 'Lisbon',
    log: 'every shortcut was another hill.',
    country: 'PT',
    region: 'europe',
    lat: 38.72,
    lon: -9.14,
  },
  {
    code: 'PAR',
    name: 'Paris',
    log: 'beautiful enough to survive the queues.',
    country: 'FR',
    region: 'europe',
    lat: 48.86,
    lon: 2.35,
  },
  {
    code: 'BER',
    name: 'Berlin',
    log: 'concrete outside, weirdness underneath.',
    country: 'DE',
    region: 'europe',
    lat: 52.52,
    lon: 13.4,
  },
  {
    code: 'HAM',
    name: 'Hamburg',
    log: 'the weather got into everything. Even the sandwiches.',
    country: 'DE',
    region: 'europe',
    lat: 53.55,
    lon: 9.99,
  },
  {
    code: 'AMS',
    name: 'Amsterdam',
    log: 'bicycles with moral superiority.',
    country: 'NL',
    region: 'europe',
    lat: 52.37,
    lon: 4.9,
  },
  {
    code: 'TOS',
    name: 'Tromsø',
    log: 'the sky ignored bedtime.',
    country: 'NO',
    region: 'europe',
    lat: 69.65,
    lon: 18.96,
  },
  {
    code: 'STO',
    name: 'Stockholm',
    log: 'even the metro outdressed me.',
    country: 'SE',
    region: 'europe',
    lat: 59.33,
    lon: 18.06,
  },
  {
    code: 'VIE',
    name: 'Vienna',
    log: 'coffee with a chain of command.',
    country: 'AT',
    region: 'europe',
    lat: 48.21,
    lon: 16.37,
  },
  {
    code: 'ROM',
    name: 'Roma',
    log: 'two thousand years old, still double-parked.',
    country: 'IT',
    region: 'europe',
    lat: 41.9,
    lon: 12.5,
  },
  {
    code: 'TRN',
    name: 'Torino',
    log: 'arcades, espresso, no reason to rush.',
    country: 'IT',
    region: 'europe',
    lat: 45.07,
    lon: 7.69,
  },
  {
    code: 'BUD',
    name: 'Budapest',
    log: 'beautiful above, hot water below.',
    country: 'HU',
    region: 'europe',
    lat: 47.5,
    lon: 19.04,
  },
  {
    code: 'AND',
    name: 'Andorra',
    log: 'tiny country, aggressively large mountains.',
    country: 'AD',
    region: 'europe',
    lat: 42.51,
    lon: 1.52,
  },
  {
    code: 'RAK',
    name: 'Marrakesh',
    log: 'the spices knew the way.',
    country: 'MA',
    region: 'africa',
    lat: 31.63,
    lon: -7.99,
  },
  {
    code: 'SEU',
    name: 'Serengeti',
    log: 'the horizon did the talking.',
    country: 'TZ',
    region: 'africa',
    lat: -2.33,
    lon: 34.83,
  },
  {
    code: 'ZNZ',
    name: 'Zanzibar',
    log: 'the ocean was showing off. Fair.',
    country: 'TZ',
    region: 'africa',
    lat: -6.16,
    lon: 39.19,
  },
  {
    code: 'OSA',
    name: 'Osaka',
    log: 'ate my body weight in takoyaki.',
    country: 'JP',
    region: 'asia',
    lat: 34.69,
    lon: 135.5,
  },
  {
    code: 'KYO',
    name: 'Kyoto',
    log: 'made quiet look carefully designed.',
    country: 'JP',
    region: 'asia',
    lat: 35.01,
    lon: 135.77,
  },
  {
    code: 'TYO',
    name: 'Tokyo',
    log: 'everything worked. Even the mysteries.',
    country: 'JP',
    region: 'asia',
    lat: 35.68,
    lon: 139.69,
  },
  {
    code: 'HIJ',
    name: 'Hiroshima',
    log: 'a city that asks for your full attention.',
    country: 'JP',
    region: 'asia',
    lat: 34.39,
    lon: 132.46,
  },
  {
    code: 'TAK',
    name: 'Takayama',
    log: 'nowhere urgent to be.',
    country: 'JP',
    region: 'asia',
    lat: 36.14,
    lon: 137.25,
  },
]
