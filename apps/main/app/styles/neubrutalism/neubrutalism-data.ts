export const TICKER =
  'NEW! NORMAL! ✶ ODD! ORDINARY! ✶ REJECT! HETERONORMATIVITY! ✶ AUDIT! YOUR! CURRENT! DECISIONS! ✶ '

export const SLOGANS = [
  'EAT! THE! GRID!',
  'AUDIT! YOUR! DECISIONS!',
  'BORING! IS! A! CHOICE!',
  'SHADOWS! ARE! SOLID!',
  'MAKE! IT! LOUDER!',
]

export const AUDIT_ITEMS = [
  'default fonts',
  'polite gradients',
  'tasteful whitespace',
]

export const ALL = 'ALL'

export const SCHEDULE = [
  {
    day: 'AUG 20',
    time: '10:00',
    act: 'OPENING: EVERYTHING IS A BUTTON',
    room: 'main hall',
    track: 'TALK',
  },
  {
    day: 'AUG 20',
    time: '16:00',
    act: 'WORKSHOP: DRAW A SHADOW BY HAND',
    room: 'room 3px',
    track: 'WORKSHOP',
  },
  { day: 'AUG 20', time: '22:00', act: '', room: 'room 3px', track: 'PARTY' },
  {
    day: 'AUG 21',
    time: '11:00',
    act: 'PANEL: IS A BORDER ENOUGH? (YES!)',
    room: 'the pink cell',
    track: 'TALK',
  },
  {
    day: 'AUG 21',
    time: '15:00',
    act: '',
    room: 'main hall',
    track: 'WORKSHOP',
  },
  {
    day: 'AUG 21',
    time: '19:00',
    act: 'KEYNOTE: GRADIENTS, AN APOLOGY',
    room: 'main hall',
    track: 'TALK',
  },
  {
    day: 'AUG 22',
    time: '12:00',
    act: '',
    room: 'the pink cell',
    track: 'TALK',
  },
  {
    day: 'AUG 22',
    time: '23:59',
    act: 'CLOSING RAVE: 8PX OFFSETS ONLY',
    room: 'everywhere',
    track: 'PARTY',
  },
]

export const AXES = [
  {
    key: 'day' as const,
    label: 'DAY',
    options: [ALL, 'AUG 20', 'AUG 21', 'AUG 22'],
  },
  {
    key: 'room' as const,
    label: 'ROOM',
    options: [ALL, 'main hall', 'room 3px', 'the pink cell', 'everywhere'],
  },
  {
    key: 'track' as const,
    label: 'TRACK',
    options: [ALL, 'TALK', 'WORKSHOP', 'PARTY'],
  },
]

export type Axes = { day: string; room: string; track: string }

export const matches = (row: (typeof SCHEDULE)[number], axes: Axes) =>
  (axes.day === ALL || row.day === axes.day) &&
  (axes.room === ALL || row.room === axes.room) &&
  (axes.track === ALL || row.track === axes.track)

export const TIERS = [
  {
    id: 'free',
    name: 'FREE',
    price: '€0',
    perks: ['all the borders', 'both exclamation marks', 'one (1) shadow'],
  },
  {
    id: 'loud',
    name: 'LOUD',
    price: '€25',
    perks: [
      'everything in free',
      'shadows follow you home',
      'front row at the rave',
    ],
  },
  {
    id: 'deluxe',
    name: 'DELUXE',
    price: '€∞',
    perks: [
      'you become the shadow',
      'your name in the ticker',
      'hype meter stuck at 10',
    ],
  },
]

export const HOUSE_RULES = [
  'EVERY! BORDER! 3PX!',
  'SHADOWS NEVER BLUR. THE SUN IS A RECTANGLE.',
  'IF IN DOUBT: LOUDER!',
]

export const VENUE =
  'SOSPEDRA CAMPUS · TOWER A · 2F INNOVATION STUDIO — AUG 20 TUE → 22 THU — DRESS CODE: OUTLINED'

export const SCALLOP_POINTS = Array.from({ length: 28 }, (_, i) => {
  const angle = (Math.PI * i) / 14
  const radius = i % 2 === 0 ? 58 : 48
  return `${(60 + radius * Math.cos(angle)).toFixed(1)},${(60 + radius * Math.sin(angle)).toFixed(1)}`
}).join(' ')
