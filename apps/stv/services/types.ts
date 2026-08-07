export type TvEvent = {
  channel: string
  competition: string
  date: string
  flag: string | null
  icon: string
  matchtime: string | null
  result: string | null
  sport: string
  teams: string
  time: string
  weekday: string
}

export type Anchor = 'past' | 'live' | 'next' | 'upcoming'

export type NodeDay = { type: 'day'; weekday: string; date: string }

export type NodeGap = { type: 'gap' }

export type NodeGroup = {
  type: 'group'
  anchor: Anchor
  events: TvEvent[]
  time: string
  unix: number | null
}

export type AgendaNode = NodeDay | NodeGap | NodeGroup
