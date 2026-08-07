import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assignAnchors, buildAgenda, LIVE_WINDOW_MS } from './agenda.ts'
import type { NodeGroup, TvEvent } from './types.ts'

const event = (overrides: Partial<TvEvent>): TvEvent => ({
  channel: 'GOL',
  competition: 'LaLiga',
  date: '7 de Agosto de 2026',
  flag: null,
  icon: '/icons/other.png',
  matchtime: null,
  result: null,
  sport: 'Fútbol',
  teams: 'A - B',
  time: '10:00',
  weekday: 'Viernes',
  ...overrides,
})

test('buildAgenda opens each weekday with a day node', () => {
  const agenda = buildAgenda([
    event({}),
    event({ weekday: 'Sábado', date: '8 de Agosto de 2026' }),
  ])
  assert.deepEqual(
    agenda.map((node) => node.type),
    ['day', 'group', 'day', 'group'],
  )
  assert.deepEqual(agenda[0], {
    type: 'day',
    weekday: 'Viernes',
    date: '7 de Agosto de 2026',
  })
})

test('buildAgenda groups events that share a kickoff time', () => {
  const agenda = buildAgenda([
    event({ teams: 'A - B' }),
    event({ teams: 'C - D' }),
    event({ time: '11:00' }),
  ])
  assert.deepEqual(
    agenda.map((node) => node.type),
    ['day', 'group', 'group'],
  )
  const first = agenda[1] as NodeGroup
  assert.equal(first.events.length, 2)
  assert.equal(first.time, '10:00')
  assert.equal(first.unix, Date.UTC(2026, 7, 7, 10, 0))
  assert.equal(first.anchor, 'past')
})

test('buildAgenda never groups across days', () => {
  const agenda = buildAgenda([
    event({}),
    event({ weekday: 'Sábado', date: '8 de Agosto de 2026' }),
  ])
  const groups = agenda.filter((node) => node.type === 'group')
  assert.equal(groups.length, 2)
})

test('buildAgenda inserts a gap on two quiet hours, within a day only', () => {
  const sameDay = buildAgenda([event({}), event({ time: '12:00' })])
  assert.deepEqual(
    sameDay.map((node) => node.type),
    ['day', 'group', 'gap', 'group'],
  )
  const acrossDays = buildAgenda([
    event({ time: '21:00' }),
    event({
      time: '23:30',
      weekday: 'Sábado',
      date: '8 de Agosto de 2026',
    }),
  ])
  assert.deepEqual(
    acrossDays.map((node) => node.type),
    ['day', 'group', 'day', 'group'],
  )
})

test('buildAgenda keeps an unparseable date as a null unix', () => {
  const agenda = buildAgenda([event({ date: 'mañana' })])
  const group = agenda[1] as NodeGroup
  assert.equal(group.unix, null)
})

test('buildAgenda returns empty for no events', () => {
  assert.deepEqual(buildAgenda([]), [])
})

const groupAt = (unix: number | null): NodeGroup => ({
  type: 'group',
  anchor: 'past',
  events: [event({})],
  time: '10:00',
  unix,
})

test('assignAnchors buckets groups around now', () => {
  const now = Date.UTC(2026, 7, 7, 12, 0)
  const agenda = [
    { type: 'day', weekday: 'Viernes', date: '7 de Agosto de 2026' } as const,
    groupAt(now - LIVE_WINDOW_MS - 1),
    groupAt(now - 1),
    groupAt(now + 1),
    groupAt(now + 2),
  ]
  const anchors = assignAnchors(agenda, now).map((node) =>
    node.type === 'group' ? node.anchor : node.type,
  )
  assert.deepEqual(anchors, ['day', 'past', 'live', 'next', 'upcoming'])
})

test('assignAnchors marks no next when everything started', () => {
  const now = Date.UTC(2026, 7, 7, 12, 0)
  const agenda = [groupAt(now - LIVE_WINDOW_MS - 1), groupAt(now - 1)]
  const anchors = assignAnchors(agenda, now).map(
    (node) => (node as NodeGroup).anchor,
  )
  assert.deepEqual(anchors, ['past', 'live'])
})

test('assignAnchors treats a null unix as upcoming', () => {
  const now = Date.UTC(2026, 7, 7, 12, 0)
  const anchors = assignAnchors([groupAt(null), groupAt(null)], now).map(
    (node) => (node as NodeGroup).anchor,
  )
  assert.deepEqual(anchors, ['next', 'upcoming'])
})

test('assignAnchors leaves the input untouched', () => {
  const agenda = [groupAt(0)]
  assignAnchors(agenda, Date.UTC(2026, 7, 7))
  assert.equal(agenda[0].anchor, 'past')
})
