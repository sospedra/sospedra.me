import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchScores, findScore, type Match, parseMatches } from './scores.ts'

const match = (overrides: Partial<Match>): Match => ({
  hour: '21',
  live_minute: '',
  local: 'valencia',
  minute: '00',
  result: '2-1',
  visitor: 'newcastle',
  ...overrides,
})

test('parseMatches keeps only well-shaped matches and normalizes them', () => {
  const valid = {
    hour: '21',
    live_minute: "45'",
    local: 'Grêmio',
    minute: '00',
    result: '0-0',
    visitor: 'SÃO PAULO',
  }
  const parsed = parseMatches({ matches: [valid, { hour: '21' }, 42, null] })
  assert.deepEqual(parsed, [
    {
      hour: '21',
      live_minute: "45'",
      local: 'gremio',
      minute: '00',
      result: '0-0',
      visitor: 'sao paulo',
    },
  ])
})

test('parseMatches returns empty on junk payloads', () => {
  assert.deepEqual(parseMatches(null), [])
  assert.deepEqual(parseMatches('inactive-account'), [])
  assert.deepEqual(parseMatches({}), [])
  assert.deepEqual(parseMatches({ matches: 'nope' }), [])
})

test('findScore joins football events by time and closest teams', () => {
  const matches = [
    match({}),
    match({ local: 'gremio', visitor: 'sao paulo', result: '0-0' }),
  ]
  const score = findScore(matches, {
    sport: 'Fútbol',
    teams: 'Valencia - Newcastle',
    time: '21:00',
  })
  assert.deepEqual(score, { matchtime: null, result: '2-1' })
})

test('findScore keeps the live minute when present', () => {
  const matches = [match({ live_minute: "45'" })]
  const score = findScore(matches, {
    sport: 'Fútbol',
    teams: 'Valencia - Newcastle',
    time: '21:00',
  })
  assert.deepEqual(score, { matchtime: "45'", result: '2-1' })
})

test('findScore ignores non-football sports and other kickoff times', () => {
  const matches = [match({})]
  const query = { teams: 'Valencia - Newcastle', time: '21:00' }
  assert.deepEqual(findScore(matches, { ...query, sport: 'Tenis' }), {
    matchtime: null,
    result: null,
  })
  assert.deepEqual(
    findScore(matches, { ...query, sport: 'Fútbol', time: '20:00' }),
    {
      matchtime: null,
      result: null,
    },
  )
  assert.deepEqual(findScore([], { ...query, sport: 'Fútbol' }), {
    matchtime: null,
    result: null,
  })
})

test('fetchScores queries today and yesterday and flattens', async (t) => {
  const payload = JSON.stringify({ matches: [match({})] })
  const mocked = t.mock.method(globalThis, 'fetch', async () => {
    return new Response(payload, { status: 200 })
  })
  const now = Date.UTC(2026, 7, 7, 12, 0)
  const scores = await fetchScores(now)
  assert.equal(scores.length, 2)
  const urls = mocked.mock.calls.map((call) => String(call.arguments[0]))
  assert.ok(urls[0].includes('date=2026-08-07'))
  assert.ok(urls[1].includes('date=2026-08-06'))
})

test('fetchScores degrades to empty on a dead endpoint', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    return new Response('inactive-account', { status: 200 })
  })
  assert.deepEqual(await fetchScores(Date.UTC(2026, 7, 7)), [])
})

test('fetchScores degrades to empty on http errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    return new Response('oops', { status: 500 })
  })
  assert.deepEqual(await fetchScores(Date.UTC(2026, 7, 7)), [])
})
