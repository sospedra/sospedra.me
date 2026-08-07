import { findGap } from './find-gap.ts'
import { parseSpanishDate } from './spanish-date.ts'
import type { AgendaNode, Anchor, NodeGroup, TvEvent } from './types.ts'

export const LIVE_WINDOW_MS = 7_200_000

export const buildAgenda = (events: readonly TvEvent[]): AgendaNode[] => {
  const agenda: AgendaNode[] = []
  let previous: TvEvent | undefined
  let group: NodeGroup | undefined
  for (const event of events) {
    if (previous === undefined || previous.weekday !== event.weekday) {
      agenda.push({ type: 'day', weekday: event.weekday, date: event.date })
      group = undefined
    } else if (findGap(previous.time, event.time)) {
      agenda.push({ type: 'gap' })
    }
    if (group !== undefined && group.time === event.time) {
      group.events.push(event)
    } else {
      group = {
        type: 'group',
        anchor: 'past',
        events: [event],
        time: event.time,
        unix: parseSpanishDate(event.date, event.time),
      }
      agenda.push(group)
    }
    previous = event
  }
  return agenda
}

const baseAnchor = (unix: number | null, now: number): Anchor => {
  if (unix === null) return 'upcoming'
  if (unix < now - LIVE_WINDOW_MS) return 'past'
  if (unix < now) return 'live'
  return 'upcoming'
}

export const assignAnchors = (
  agenda: readonly AgendaNode[],
  now: number,
): AgendaNode[] => {
  const nextIndex = agenda.findIndex(
    (node) =>
      node.type === 'group' && baseAnchor(node.unix, now) === 'upcoming',
  )
  return agenda.map((node, index) => {
    if (node.type !== 'group') return node
    const anchor = index === nextIndex ? 'next' : baseAnchor(node.unix, now)
    return { ...node, anchor }
  })
}
