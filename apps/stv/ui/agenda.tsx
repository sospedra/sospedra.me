'use client'

import { useEffect, useState } from 'react'
import { assignAnchors } from 'services/agenda'
import type { AgendaNode } from 'services/types'
import { Day } from './day'
import { Gap } from './gap'
import { Group } from './group'

// schedule epochs hold Madrid wall-clock as UTC, so read the viewer clock the same way
const wallClockAsUtc = (): number => {
  const now = new Date()
  return now.getTime() - now.getTimezoneOffset() * 60_000
}

const nodeView = (node: AgendaNode, index: number) => {
  if (node.type === 'day') return <Day key={`day-${node.weekday}`} {...node} />
  if (node.type === 'gap') return <Gap key={`gap-${index}`} />
  return <Group key={`group-${node.time}-${index}`} {...node} />
}

export const Agenda = (props: { agenda: AgendaNode[] }) => {
  const [agenda, setAgenda] = useState(props.agenda)

  useEffect(() => {
    setAgenda((nodes) => assignAnchors(nodes, wallClockAsUtc()))
  }, [])

  return <ol>{agenda.map(nodeView)}</ol>
}
