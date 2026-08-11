'use client'

import { useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import css from './neubrutalism.module.css'

const SLOGANS = [
  'EAT! THE! GRID!',
  'AUDIT! YOUR! DECISIONS!',
  'BORING! IS! A! CHOICE!',
  'SHADOWS! ARE! SOLID!',
  'MAKE! IT! LOUDER!',
]

const AUDIT_ITEMS = ['default fonts', 'polite gradients', 'tasteful whitespace']

const TICKER =
  'NEW! NORMAL! ✶ ODD! ORDINARY! ✶ REJECT! HETERONORMATIVITY! ✶ AUDIT! YOUR! CURRENT! DECISIONS! ✶ '

const SCALLOP_POINTS = Array.from({ length: 28 }, (_, i) => {
  const angle = (Math.PI * i) / 14
  const radius = i % 2 === 0 ? 58 : 48
  return `${(60 + radius * Math.cos(angle)).toFixed(1)},${(60 + radius * Math.sin(angle)).toFixed(1)}`
}).join(' ')

const Scallop = () => (
  <svg viewBox='0 0 120 120' className={css.scallop} aria-hidden='true'>
    <polygon
      points={SCALLOP_POINTS}
      fill='#58b368'
      stroke='#141414'
      strokeWidth='4'
      strokeLinejoin='round'
    />
    <circle
      cx='60'
      cy='60'
      r='30'
      fill='#f2eee3'
      stroke='#141414'
      strokeWidth='4'
    />
  </svg>
)

type NeubrutalismViewProps = { fontVars: string }

const NeubrutalismView = ({ fontVars }: NeubrutalismViewProps) => {
  const [going, setGoing] = useState(24)
  const [oddinary, setOddinary] = useState(false)
  const [hype, setHype] = useState(4)
  const [checked, setChecked] = useState<boolean[]>([false, false, false])
  const [sloganIndex, setSloganIndex] = useState(0)
  const [stamp, setStamp] = useState(0)

  const shout = () => {
    setSloganIndex((index) => (index + 1) % SLOGANS.length)
    setStamp((n) => n + 1)
  }

  const toggleCheck = (i: number) =>
    setChecked((prev) =>
      prev.map((value, index) => (index === i ? !value : value)),
    )

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <div data-mode={oddinary ? 'oddinary' : 'ordinary'} className={css.root}>
        <header className={css.masthead}>
          <span className={css.logo}>ODD•ORDINARY</span>
          <span className={css.mastheadNote}>a neubrutalism stress test</span>
          <Link url='/styles' className={css.backChip}>
            ◀ STYLES
          </Link>
        </header>

        <div className={css.ticker} aria-hidden='true'>
          <div className={css.tickerTrack}>
            <span className={css.tickerText}>{TICKER}</span>
            <span className={css.tickerText}>{TICKER}</span>
          </div>
        </div>

        <section className={css.hero}>
          <div className={`${css.cell} ${css.heroLeft}`}>
            <h1 className={css.heroTitle}>
              REJECT!
              <br />
              DEFAULT!
              <br />
              DESIGN!
            </h1>
          </div>
          <div className={`${css.cell} ${css.heroRight}`}>
            <span className={css.loud} data-stamp={stamp}>
              LOUD!
            </span>
            <p className={css.heroSub}>
              every border is 3px. every shadow is a solid block. nothing blurs,
              nothing fades, nothing apologizes.
            </p>
          </div>
        </section>

        <section className={css.bento} aria-label='Working toy controls'>
          <div className={`${css.cell} ${css.rsvp}`}>
            <h2 className={css.cellTitle}>RSVP</h2>
            <button
              type='button'
              className={css.btn3d}
              onClick={() => setGoing((n) => n + 1)}
            >
              COUNT ME IN
            </button>
            <p className={css.count}>
              <strong>{going}</strong> going
            </p>
          </div>

          <div className={`${css.cell} ${css.mode}`}>
            <h2 className={css.cellTitle}>MODE</h2>
            <button
              type='button'
              role='switch'
              aria-checked={oddinary}
              className={css.switch}
              onClick={() => setOddinary((v) => !v)}
            >
              <span className={css.knob} />
            </button>
            <p className={css.modeLabel}>
              {oddinary ? 'ODDINARY' : 'ORDINARY'}
            </p>
          </div>

          <div className={`${css.cell} ${css.hype}`}>
            <h2 className={css.cellTitle}>HYPE METER</h2>
            <div className={css.hypeRow}>
              <button
                type='button'
                className={`${css.btn3d} ${css.step}`}
                aria-label='Less hype'
                onClick={() => setHype((n) => Math.max(0, n - 1))}
              >
                −
              </button>
              <span className={css.hypeValue}>{hype}</span>
              <button
                type='button'
                className={`${css.btn3d} ${css.step}`}
                aria-label='More hype'
                onClick={() => setHype((n) => Math.min(10, n + 1))}
              >
                +
              </button>
            </div>
            <div
              className={css.meter}
              role='img'
              aria-label={`Hype ${hype} of 10`}
            >
              <div
                className={css.meterFill}
                style={{ width: `${hype * 10}%` }}
              />
            </div>
          </div>

          <div className={`${css.cell} ${css.dates}`}>
            <Scallop />
            <span className={css.dateChip}>AUG 20—22</span>
          </div>

          <div className={`${css.cell} ${css.audit}`}>
            <h2 className={css.cellTitle}>AUDIT! YOUR! DECISIONS!</h2>
            <ul className={css.auditList}>
              {AUDIT_ITEMS.map((item, i) => (
                <li key={item}>
                  <label className={css.check}>
                    <input
                      type='checkbox'
                      className={css.checkInput}
                      checked={checked[i]}
                      onChange={() => toggleCheck(i)}
                    />
                    <span className={css.checkBox} aria-hidden='true'>
                      {checked[i] ? '✗' : ''}
                    </span>
                    <span className={checked[i] ? css.checkDone : undefined}>
                      {item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${css.cell} ${css.shout}`}>
            <p key={stamp} className={css.slogan}>
              {SLOGANS[sloganIndex]}
            </p>
            <button type='button' className={css.btn3d} onClick={shout}>
              MAKE IT LOUDER
            </button>
          </div>

          <div className={`${css.cell} ${css.ticket}`}>
            <span className={css.ticketAdmit}>ADMIT ∞</span>
            <span className={css.ticketBars} aria-hidden='true' />
            <span className={css.ticketNote}>
              non-transferable. extremely transferable.
            </span>
          </div>
        </section>

        <footer className={css.footer}>
          <p>
            neubrutalism: web brutalism with candy. flat fills, hard 8px
            offsets, borders that admit they are borders. the shadow never blurs
            because the sun here is a rectangle.
          </p>
        </footer>
      </div>
    </Shell>
  )
}

export default NeubrutalismView
