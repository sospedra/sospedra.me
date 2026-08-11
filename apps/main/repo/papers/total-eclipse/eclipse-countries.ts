/** The nine countries the 12 August 2026 shadow touches, plus the sites worth
 * standing on. */

export type EclipseSite = {
  name: string
  latitude: number
  longitude: number
  /** Overrides the country zone where a country spans several. */
  zone?: string
}

export type EclipseCountry = {
  code: string
  name: string
  /** True where the umbra reaches this country's ground. */
  band: boolean
  zone: string
  /** One line in the paper's terms: what this country actually gets. */
  verdict: string
  sites: EclipseSite[]
}

const KRASNOYARSK = 'Asia/Krasnoyarsk'
const YAKUTSK = 'Asia/Yakutsk'
const DANMARKSHAVN = 'America/Danmarkshavn'

export const ECLIPSE_COUNTRIES: EclipseCountry[] = [
  {
    code: 'RU',
    name: 'Russia',
    band: true,
    zone: KRASNOYARSK,
    verdict:
      'The umbra lands here first, near local midnight, with the sun on the horizon line.',
    sites: [
      { name: 'Cape Pronchishchev', latitude: 75.5, longitude: 113.3 },
      { name: 'Nordvik', latitude: 74.02, longitude: 111.51 },
      {
        name: 'Yuryung-Khaya',
        latitude: 72.8,
        longitude: 113.1,
        zone: YAKUTSK,
      },
      { name: 'Saskylakh', latitude: 71.97, longitude: 114.09, zone: YAKUTSK },
      { name: 'Khatanga', latitude: 71.98, longitude: 102.47 },
      { name: 'Tiksi', latitude: 71.63, longitude: 128.87, zone: YAKUTSK },
      { name: 'Olenyok', latitude: 68.5, longitude: 112.44, zone: YAKUTSK },
    ],
  },
  {
    code: 'GL',
    name: 'Greenland',
    band: true,
    zone: DANMARKSHAVN,
    verdict:
      'The northeast tip gets seconds of totality. The rest of the island gets a deep partial.',
    sites: [
      { name: 'Station Nord', latitude: 81.6, longitude: -16.66 },
      { name: 'Danmarkshavn', latitude: 76.77, longitude: -18.67 },
      { name: 'Daneborg', latitude: 74.3, longitude: -20.22 },
      { name: 'Summit Camp', latitude: 72.58, longitude: -38.46 },
      {
        name: 'Ittoqqortoormiit',
        latitude: 70.48,
        longitude: -21.96,
        zone: 'America/Scoresbysund',
      },
    ],
  },
  {
    code: 'IS',
    name: 'Iceland',
    band: true,
    zone: 'Atlantic/Reykjavik',
    verdict:
      'The western half sits inside the band with the sun high. Only cloud can take it away.',
    sites: [
      { name: 'Látrabjarg', latitude: 65.5022, longitude: -24.5325 },
      { name: 'Ísafjörður', latitude: 66.0748, longitude: -23.1355 },
      { name: 'Grundarfjörður', latitude: 64.9219, longitude: -23.2578 },
      { name: 'Reykjavík', latitude: 64.1466, longitude: -21.9426 },
      { name: 'Keflavík', latitude: 64.0049, longitude: -22.5624 },
      { name: 'Stykkishólmur', latitude: 65.0757, longitude: -22.7286 },
      { name: 'Akureyri', latitude: 65.6835, longitude: -18.0878 },
      { name: 'Vík', latitude: 63.4187, longitude: -19.006 },
      { name: 'Höfn', latitude: 64.2539, longitude: -15.2082 },
    ],
  },
  {
    code: 'ES',
    name: 'Spain',
    band: true,
    zone: 'Europe/Madrid',
    verdict:
      'Six minutes of landfall at dinner time. The band threads between Madrid and Barcelona.',
    sites: [
      { name: 'Oviedo', latitude: 43.3619, longitude: -5.8494 },
      { name: 'A Coruña', latitude: 43.3623, longitude: -8.4115 },
      { name: 'Santander', latitude: 43.4623, longitude: -3.805 },
      { name: 'Bilbao', latitude: 43.263, longitude: -2.935 },
      { name: 'Burgos', latitude: 42.3439, longitude: -3.6969 },
      { name: 'Valladolid', latitude: 41.6523, longitude: -4.7245 },
      { name: 'Soria', latitude: 41.7643, longitude: -2.4649 },
      { name: 'Zaragoza', latitude: 41.6488, longitude: -0.8891 },
      { name: 'Teruel', latitude: 40.3456, longitude: -1.1065 },
      { name: 'València', latitude: 39.4699, longitude: -0.3763 },
      { name: 'Tarragona', latitude: 41.1189, longitude: 1.2445 },
      { name: 'Palma', latitude: 39.5696, longitude: 2.6502 },
      { name: 'Madrid', latitude: 40.4168, longitude: -3.7038 },
      { name: 'Barcelona', latitude: 41.3874, longitude: 2.1686 },
      { name: 'Sevilla', latitude: 37.3891, longitude: -5.9845 },
    ],
  },
  {
    code: 'PT',
    name: 'Portugal',
    band: false,
    zone: 'Europe/Lisbon',
    verdict:
      'A deep partial the whole way. The band stops short of the border, so the corona stays hidden.',
    sites: [
      { name: 'Porto', latitude: 41.1579, longitude: -8.6291 },
      { name: 'Braga', latitude: 41.5454, longitude: -8.4265 },
      { name: 'Coimbra', latitude: 40.2056, longitude: -8.4196 },
      { name: 'Lisboa', latitude: 38.7223, longitude: -9.1393 },
      { name: 'Faro', latitude: 37.0194, longitude: -7.9304 },
    ],
  },
  {
    code: 'FR',
    name: 'France',
    band: false,
    zone: 'Europe/Paris',
    verdict:
      'A deep partial everywhere. The southwest gets closest, and closest is still a miss.',
    sites: [
      { name: 'Bordeaux', latitude: 44.8378, longitude: -0.5792 },
      { name: 'Toulouse', latitude: 43.6045, longitude: 1.4442 },
      { name: 'Perpignan', latitude: 42.6987, longitude: 2.8956 },
      { name: 'Marseille', latitude: 43.2965, longitude: 5.3698 },
      { name: 'Lyon', latitude: 45.764, longitude: 4.8357 },
      { name: 'Nantes', latitude: 47.2184, longitude: -1.5536 },
      { name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
      { name: 'Strasbourg', latitude: 48.5734, longitude: 7.7521 },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    band: false,
    zone: 'Europe/London',
    verdict: 'A deep partial, glasses on from first bite to last.',
    sites: [
      { name: 'London', latitude: 51.5074, longitude: -0.1278 },
      { name: 'Plymouth', latitude: 50.3755, longitude: -4.1427 },
      { name: 'Cardiff', latitude: 51.4816, longitude: -3.1791 },
      { name: 'Manchester', latitude: 53.4808, longitude: -2.2426 },
      { name: 'Belfast', latitude: 54.5973, longitude: -5.9301 },
      { name: 'Glasgow', latitude: 55.8642, longitude: -4.2518 },
      { name: 'Edinburgh', latitude: 55.9533, longitude: -3.1883 },
      { name: 'Newcastle', latitude: 54.9783, longitude: -1.6178 },
    ],
  },
  {
    code: 'IE',
    name: 'Ireland',
    band: false,
    zone: 'Europe/Dublin',
    verdict: 'The deepest partial outside Iberia, with the sun still well up.',
    sites: [
      { name: 'Cork', latitude: 51.8985, longitude: -8.4756 },
      { name: 'Galway', latitude: 53.2707, longitude: -9.0568 },
      { name: 'Limerick', latitude: 52.6638, longitude: -8.6267 },
      { name: 'Waterford', latitude: 52.2593, longitude: -7.11 },
      { name: 'Dublin', latitude: 53.3498, longitude: -6.2603 },
      { name: 'Sligo', latitude: 54.2766, longitude: -8.4761 },
    ],
  },
  {
    code: 'DK',
    name: 'Denmark',
    band: false,
    zone: 'Europe/Copenhagen',
    verdict:
      'Denmark keeps a partial at home. Its slice of totality is 3,000 km north, at Station Nord.',
    sites: [
      { name: 'Esbjerg', latitude: 55.4765, longitude: 8.4594 },
      { name: 'Aalborg', latitude: 57.0488, longitude: 9.9217 },
      { name: 'Aarhus', latitude: 56.1629, longitude: 10.2039 },
      { name: 'Odense', latitude: 55.4038, longitude: 10.4024 },
      { name: 'København', latitude: 55.6761, longitude: 12.5683 },
      { name: 'Rønne', latitude: 55.1004, longitude: 14.7008 },
    ],
  },
]

/**
 * Sites the paper vouches for as deep inside the band. The panel names one of
 * these when the reader stands outside, because "415 km NE" is a number and
 * "A Coruña" is a plan.
 */
const REFUGE_SITES: (EclipseSite & { country: string })[] = [
  { name: 'A Coruña', latitude: 43.3623, longitude: -8.4115, country: 'Spain' },
  { name: 'Oviedo', latitude: 43.3619, longitude: -5.8494, country: 'Spain' },
  { name: 'León', latitude: 42.5987, longitude: -5.5671, country: 'Spain' },
  { name: 'Burgos', latitude: 42.3439, longitude: -3.6969, country: 'Spain' },
  { name: 'Soria', latitude: 41.7643, longitude: -2.4649, country: 'Spain' },
  { name: 'Zaragoza', latitude: 41.6488, longitude: -0.8891, country: 'Spain' },
  { name: 'Teruel', latitude: 40.3456, longitude: -1.1065, country: 'Spain' },
  { name: 'Castelló', latitude: 39.9864, longitude: -0.0513, country: 'Spain' },
  { name: 'Palma', latitude: 39.5696, longitude: 2.6502, country: 'Spain' },
  {
    name: 'Látrabjarg',
    latitude: 65.5022,
    longitude: -24.5325,
    country: 'Iceland',
  },
  {
    name: 'Cape Pronchishchev',
    latitude: 75.5,
    longitude: 113.3,
    country: 'Russia',
  },
  { name: 'Nordvik', latitude: 74.02, longitude: 111.51, country: 'Russia' },
  {
    name: 'Station Nord',
    latitude: 81.6,
    longitude: -16.66,
    country: 'Greenland',
  },
  {
    name: 'Reykjavík',
    latitude: 64.1466,
    longitude: -21.9426,
    country: 'Iceland',
  },
  {
    name: 'Ísafjörður',
    latitude: 66.0748,
    longitude: -23.1355,
    country: 'Iceland',
  },
]

export const nearestRefuge = (
  latitude: number,
  longitude: number,
  distanceKm: (
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
  ) => number,
) => {
  let best = REFUGE_SITES[0]
  let bestKm = Number.POSITIVE_INFINITY
  for (const site of REFUGE_SITES) {
    const km = distanceKm(latitude, longitude, site.latitude, site.longitude)
    if (km < bestKm) {
      bestKm = km
      best = site
    }
  }
  return { site: best, km: bestKm }
}

export const countryByCode = (code: string): EclipseCountry =>
  ECLIPSE_COUNTRIES.find((country) => country.code === code) ??
  ECLIPSE_COUNTRIES[3]

export const zoneOf = (country: EclipseCountry, site?: EclipseSite): string =>
  site?.zone ?? country.zone
