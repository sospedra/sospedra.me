import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { Match } from './scores.ts'
import { parseSourceAgenda } from './source.ts'

const FIXTURE = readFileSync(
  new URL('./fixtures/source.html', import.meta.url),
  'utf8',
)

test('parseSourceAgenda extracts every event from the daylist only', () => {
  const events = parseSourceAgenda(FIXTURE, [])
  assert.equal(events.length, 31)
  assert.deepEqual(
    [...new Set(events.map((event) => event.weekday))],
    ['Viernes', 'Sábado', 'Domingo'],
  )
})

test('parseSourceAgenda maps the scraped fields verbatim, trimmed', () => {
  const events = parseSourceAgenda(FIXTURE, [])
  assert.deepEqual(events[0], {
    channel: 'Movistar Plus',
    competition: 'MASTERS MONTREAL',
    date: '7 de Agosto de 2026',
    flag: null,
    icon: '/icons/tennis.png',
    matchtime: null,
    result: null,
    sport: 'Tenis',
    teams: 'Jodar - Musetti',
    time: '01:05',
    weekday: 'Viernes',
  })
  assert.deepEqual(events.at(-1), {
    channel: 'M+ Vamos 2',
    competition: 'BRASILEIRAO',
    date: '9 de Agosto de 2026',
    flag: null,
    icon: '/icons/football.png',
    matchtime: null,
    result: null,
    sport: 'Fútbol',
    teams: 'Palmeiras - Internacional',
    time: '21:00',
    weekday: 'Domingo',
  })
})

test('parseSourceAgenda joins live scores onto football events', () => {
  const scores: Match[] = [
    {
      hour: '21',
      live_minute: "45'",
      local: 'valencia',
      minute: '00',
      result: '2-1',
      visitor: 'newcastle',
    },
    {
      hour: '18',
      live_minute: '',
      local: 'coventry',
      minute: '30',
      result: '0-3',
      visitor: 'espanyol',
    },
  ]
  const events = parseSourceAgenda(FIXTURE, scores)
  const valencia = events.find(
    (event) => event.teams === 'Valencia - Newcastle',
  )
  assert.equal(valencia?.result, '2-1')
  assert.equal(valencia?.matchtime, "45'")
  const coventry = events.find((event) => event.teams === 'Coventry - Espanyol')
  assert.equal(coventry?.result, '0-3')
  assert.equal(coventry?.matchtime, null)
  const tennis = events.find((event) => event.sport === 'Tenis')
  assert.equal(tennis?.result, null)
})
