'use client'

import { useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import { useSheetStack } from '../use-sheet-stack'
import css from './neubrutalism.module.css'
import { ALL, type Axes, SLOGANS } from './neubrutalism-data'
import {
  AuditCell,
  Badge,
  CoverPlate,
  HypeCell,
  ModeCell,
  ProgrammePlate,
  RsvpCell,
  ShoutCell,
  Ticker,
  TicketCell,
  TicketsPlate,
} from './neubrutalism-pages'

const PLATES = [
  { id: 'cover', label: 'COVER', tone: 'cream' },
  { id: 'toys', label: 'THE TOYS', tone: 'pink' },
  { id: 'programme', label: 'THE PROGRAMME', tone: 'yellow' },
  { id: 'tickets', label: 'TICKETS + MANIFESTO', tone: 'blue' },
] as const

type NeubrutalismViewProps = { fontVars: string }

const NeubrutalismView = ({ fontVars }: NeubrutalismViewProps) => {
  const { refs, active, turnTo } = useSheetStack()
  const [going, setGoing] = useState(24)
  const [oddinary, setOddinary] = useState(false)
  const [hype, setHype] = useState(4)
  const [checked, setChecked] = useState<boolean[]>([false, false, false])
  const [sloganIndex, setSloganIndex] = useState(0)
  const [stamp, setStamp] = useState(0)
  const [axes, setAxes] = useState<Axes>({ day: ALL, room: ALL, track: ALL })

  const rsvp = () => setGoing((n) => n + 1)

  const shout = () => {
    setSloganIndex((index) => (index + 1) % SLOGANS.length)
    setStamp((n) => n + 1)
  }

  const toggleCheck = (i: number) =>
    setChecked((prev) =>
      prev.map((value, index) => (index === i ? !value : value)),
    )

  const pickAxis = (key: keyof Axes, option: string) =>
    setAxes((prev) => ({ ...prev, [key]: option }))

  const bodies = [
    <CoverPlate key='cover' />,
    <div key='toys' className={css.bento}>
      <Badge label='PRESS!' className={css.toysBadge} />
      <div className={`${css.cell} ${css.toysTitle}`}>
        <h2 className={css.toysTitleText}>
          THE!
          <br />
          TOYS!
        </h2>
        <p className={css.toysNote}>press everything. it all works.</p>
      </div>
      <RsvpCell going={going} onRsvp={rsvp} />
      <ModeCell oddinary={oddinary} onToggle={() => setOddinary((v) => !v)} />
      <HypeCell
        hype={hype}
        onLess={() => setHype((n) => Math.max(0, n - 1))}
        onMore={() => setHype((n) => Math.min(10, n + 1))}
      />
      <AuditCell checked={checked} onToggle={toggleCheck} />
      <ShoutCell slogan={SLOGANS[sloganIndex]} stamp={stamp} onShout={shout} />
      <TicketCell />
    </div>,
    <ProgrammePlate key='programme' axes={axes} onAxis={pickAxis} />,
    <TicketsPlate key='tickets' going={going} onBuy={rsvp} />,
  ]

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <div data-mode={oddinary ? 'oddinary' : 'ordinary'} className={css.root}>
        <div className={css.backTag}>
          <Link url='/styles'>◀ STYLES</Link>
        </div>

        <nav className={css.rail} aria-label='Programme plates'>
          {PLATES.map((plate, index) => (
            <button
              key={plate.id}
              type='button'
              className={css.railChip}
              data-on={active === index ? 'true' : undefined}
              aria-label={`Turn to plate ${index + 1}: ${plate.label}`}
              onClick={() => turnTo(index)}
            >
              {index + 1}
            </button>
          ))}
        </nav>

        <div className={css.issue}>
          {PLATES.map((plate, index) => (
            <section
              key={plate.id}
              ref={(node) => {
                refs.current[index] = node
              }}
              data-sheet={index}
              data-tone={plate.tone}
              className={css.sheet}
              aria-label={`Plate ${index + 1} — ${plate.label}`}
            >
              <div className={css.sheetInner}>
                <Ticker />
                <div className={css.board}>{bodies[index]}</div>
                <p
                  className={css.folio}
                  data-band={index === 3 ? 'true' : undefined}
                >
                  <span>the ODD•ORDINARY PROGRAMME</span>
                  <span className={css.folioPlate}>
                    PLATE {index + 1} — {plate.label}
                  </span>
                  <span>{index + 1} / 4</span>
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export default NeubrutalismView
