export type StationBadge = {
  mark: string
  bg: string
  fg: string
}

export type StationPresentation = {
  id: string
  tagline: string
  badge: StationBadge
}

// editorial order: disco labels first, dance, then lounge closes the dial
export const PRESENTATION: StationPresentation[] = [
  {
    id: 'atlantic',
    tagline: 'Disco classics from the Atlantic shelf',
    badge: { mark: 'ATL', bg: '#d21f26', fg: '#ffffff' },
  },
  {
    id: 'prelude',
    tagline: 'Boogie and post-disco on Prelude',
    badge: { mark: 'PRE', bg: '#1953a8', fg: '#ffffff' },
  },
  {
    id: 'casablanca',
    tagline: 'Glitter-era disco, Casablanca style',
    badge: { mark: 'CAS', bg: '#8a4b1f', fg: '#ffe9c2' },
  },
  {
    id: 'columbia',
    tagline: 'Disco 45s from the Columbia crates',
    badge: { mark: 'COL', bg: '#b01e23', fg: '#ffffff' },
  },
  {
    id: 'tk-disco',
    tagline: 'The Miami TK sound of 1978',
    badge: { mark: 'T.K.', bg: '#e77c1a', fg: '#231703' },
  },
  {
    id: 'unidisco',
    tagline: 'Italo and hi-NRG imports',
    badge: { mark: 'UNI', bg: '#5b2d84', fg: '#ffffff' },
  },
  {
    id: 'salsoul',
    tagline: 'Orchestrated New York disco',
    badge: { mark: 'SAL', bg: '#e0331f', fg: '#ffffff' },
  },
  {
    id: 'west-end',
    tagline: 'New York garage and proto-house',
    badge: { mark: 'W.E.', bg: '#101010', fg: '#ffffff' },
  },
  {
    id: 'solar',
    tagline: 'The sound of Los Angeles',
    badge: { mark: 'SOL', bg: '#f2b01e', fg: '#231703' },
  },
  {
    id: 'eurodance',
    tagline: 'German eurodance, straight from FFH',
    badge: { mark: 'EUR', bg: '#0aa14a', fg: '#ffffff' },
  },
  {
    id: 'millenium-dance',
    tagline: 'Trance for the year 2000',
    badge: { mark: 'MIL', bg: '#0d7f8c', fg: '#ffffff' },
  },
  {
    id: 'meganight',
    tagline: 'Club channels after midnight',
    badge: { mark: 'MEGA', bg: '#26205e', fg: '#9fd0ff' },
  },
  {
    id: 'bad-beat',
    tagline: 'Only the best breakbeat',
    badge: { mark: 'BAD', bg: '#2f2f2f', fg: '#7fff7f' },
  },
  {
    id: 'soulful',
    tagline: 'Deep soulful house all day',
    badge: { mark: 'SOUL', bg: '#7a2450', fg: '#ffd9ec' },
  },
  {
    id: 'sun-cafe',
    tagline: 'Café soul for slow mornings',
    badge: { mark: 'CAFE', bg: '#a86212', fg: '#fff3d9' },
  },
  {
    id: 'sun-bar',
    tagline: 'Bar grooves for golden hour',
    badge: { mark: 'BAR', bg: '#54341c', fg: '#f5ddc0' },
  },
  {
    id: 'smooth-jazz',
    tagline: 'Smooth jazz at lounge tempo',
    badge: { mark: 'JAZZ', bg: '#123c6b', fg: '#cfe4ff' },
  },
  {
    id: 'monte-carlo',
    tagline: 'Lounge hits from Moscow',
    badge: { mark: 'RMC', bg: '#0d0d0d', fg: '#e8c356' },
  },
]
