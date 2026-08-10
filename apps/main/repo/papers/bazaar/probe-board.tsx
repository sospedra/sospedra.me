'use client'

import type React from 'react'
import { useState } from 'react'
import { tapHaptic } from 'services/haptics'
import css from './probe-board.module.css'

type Probe = {
  name: string
  instrument: string
  order: string
  verdict: string
  tone: 'win' | 'mid' | 'loss'
}

const ProbeBoard: React.FC<{ label: string; probes: Probe[] }> = (props) => {
  const [active, setActive] = useState(0)
  const probe = props.probes[active]
  if (!probe) return null

  return (
    <section aria-label={props.label} className={css.board}>
      <div className={css.head}>
        <span className={css.label}>{props.label}</span>
        <span aria-hidden='true' className={css.count}>
          one round, {props.probes.length} concurrent probes
        </span>
      </div>
      <div className={css.tabs}>
        {props.probes.map((entry, index) => (
          <button
            aria-pressed={index === active}
            className={css.tab}
            key={entry.name}
            onClick={() => {
              tapHaptic()
              setActive(index)
            }}
            type='button'
          >
            <span className={css.tabIndex}>p{index + 1}</span>
            {entry.name}
          </button>
        ))}
      </div>
      <div aria-live='polite' className={css.body}>
        <p className={css.instrument}>{probe.instrument}</p>
        <pre className={css.order}>{probe.order}</pre>
        <p className={css.verdict} data-tone={probe.tone}>
          <span className={css.kind}>verdict</span>
          {probe.verdict}
        </p>
      </div>
    </section>
  )
}

export default ProbeBoard
