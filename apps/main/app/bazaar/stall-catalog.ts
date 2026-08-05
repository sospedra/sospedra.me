import { mapValues } from 'es-toolkit'
import type { Route } from 'next'
import { type BazaarStallId, SIM_DIMS } from './stalls-manifest'

export const DIMS = mapValues(SIM_DIMS, ({ dispW, dispH }) => ({
  width: dispW,
  height: dispH,
}))

export type StallLink = { label: string; href: string; external?: boolean }

export type StallSpec = {
  label: string
  href: Route
  external?: boolean
  tint: string
  desc: string
  links: StallLink[]
}

const USES_DIALOG = [
  'Omakase.',
  'Hardware. Software.',
  'Only what survives service',
  'makes the menu.',
].join('\n')
const PAPERS_DIALOG = [
  '[signal stabilizes]',
  'Types. Platforms. Politics.',
  'Epistemics get messy.',
  'Choose a paper.',
].join('\n')
const MANUAL_DIALOG = [
  'Right then, colleague!',
  'Values: sound.',
  'Blind spots: BZZT...',
  'Trust needs servicing.',
].join('\n')
const CONSOLE_DIALOG = [
  'Ooh! A human cursor!',
  'So many tiny doors.',
  'Type HELP.',
].join('\n')
const TALKS_DIALOG = [
  'First rule of Video Club:',
  'pick a tape.',
  'The talks get technical.',
  'Be kind. Rewind.',
].join('\n')
const W98_DIALOG = [
  'Bzzt. Mind the hose.',
  'The plants grew on me.',
  'Booting takes a minute.',
].join('\n')
const TRAVEL_DIALOG = [
  'New friend!',
  'Supernova in twenty-two.',
  'Coming?',
].join('\n')
const MAP_DIALOG = [
  'Mrh. You woke me.',
  'Lost? We are all lost here.',
  'Every stall is a door.',
  'u are here.',
].join('\n')
export const GAMES_CONVERSATION = [
  { speaker: 'sister', text: 'NEW CHALLENGER!!!' },
  { speaker: 'brother', text: "We don't know them." },
  { speaker: 'sister', text: 'Best of three?' },
  { speaker: 'brother', text: 'I choose.' },
] as const

export const STALLS: Record<BazaarStallId, StallSpec> = {
  uses: {
    label: 'uses',
    href: '/uses',
    tint: '#e06080',
    desc: USES_DIALOG,
    links: [{ label: 'browse the gear', href: '/uses' }],
  },
  games: {
    label: 'games',
    href: '/games',
    tint: '#4a90d9',
    desc: GAMES_CONVERSATION.map((turn) => turn.text).join('\n'),
    links: [{ label: 'enter the arcade', href: '/games' }],
  },
  travel: {
    label: 'travel',
    href: '/travel',
    tint: '#7a6fe6',
    desc: TRAVEL_DIALOG,
    links: [{ label: 'see the flight log', href: '/travel' }],
  },
  manual: {
    label: 'manual',
    href: '/manual',
    tint: '#e06080',
    desc: MANUAL_DIALOG,
    links: [{ label: 'read the manual', href: '/manual' }],
  },
  console: {
    label: 'console',
    href: '/console',
    tint: '#a8b04a',
    desc: CONSOLE_DIALOG,
    links: [{ label: 'open the archive', href: '/console' }],
  },
  w98: {
    label: 'w98',
    href: '/w98',
    tint: '#4bd2e1',
    desc: W98_DIALOG,
    links: [{ label: 'boot windows 98', href: '/w98' }],
  },
  talks: {
    label: 'talks',
    href: '/videoclub',
    tint: '#e0a040',
    desc: TALKS_DIALOG,
    links: [{ label: 'play the tapes', href: '/videoclub' }],
  },
  papers: {
    label: 'papers',
    href: '/papers',
    tint: '#7ab0d0',
    desc: PAPERS_DIALOG,
    links: [{ label: 'read the papers', href: '/papers' }],
  },
  map: {
    label: 'map',
    href: '/papers/bazaar' as Route,
    tint: '#c86fd6',
    desc: MAP_DIALOG,
    links: [{ label: 'read the bazaar paper', href: '/papers/bazaar' }],
  },
}
