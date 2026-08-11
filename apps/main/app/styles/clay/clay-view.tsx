'use client'

import { useRef, useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import css from './clay.module.css'
import ClayCritters from './clay-critters'
import ClayPad from './clay-pad'

const Star = () => (
  <svg viewBox='0 0 96 96' className={css.prizeArt} aria-hidden='true'>
    <path
      d='M48 8l11 26 28 3-21 19 6 28-24-15-24 15 6-28L9 37l28-3z'
      fill='#f5d789'
      stroke='#c4a45a'
      strokeWidth='6'
      strokeLinejoin='round'
    />
  </svg>
)

const PRIZES = [
  { id: 'star', label: 'a butter star', art: <Star /> },
  {
    id: 'heart',
    label: 'a salmon heart',
    art: <span className={css.prizeHeart} />,
  },
  {
    id: 'ghost',
    label: 'a cream ghost',
    art: <span className={css.prizeGhost} />,
  },
  { id: 'ball', label: 'a blue ball', art: <span className={css.prizeBall} /> },
]

type BoxPhase = 'idle' | 'shaking' | 'open'

const BlindBox = () => {
  const [phase, setPhase] = useState<BoxPhase>('idle')
  const [prize, setPrize] = useState(0)
  const rolls = useRef(0)

  const open = () => {
    if (phase === 'shaking') return
    setPhase('shaking')
    rolls.current += 1
    window.setTimeout(() => {
      setPrize(Math.floor(Math.random() * PRIZES.length))
      setPhase('open')
    }, 750)
  }

  return (
    <div className={css.boxScene}>
      {phase === 'open' && (
        <div
          key={rolls.current}
          className={css.prize}
          role='img'
          aria-label={PRIZES[prize].label}
        >
          {PRIZES[prize].art}
        </div>
      )}
      <button
        type='button'
        className={css.box}
        data-phase={phase}
        onClick={open}
        aria-label='Blind box. Press to shake one open.'
      >
        <span className={css.boxLid} />
        <span className={css.boxMark}>?</span>
      </button>
      <p className={css.boxNote}>
        {phase === 'open'
          ? `you pulled ${PRIZES[prize].label}`
          : 'blind box — shake one open'}
      </p>
    </div>
  )
}

type ClayViewProps = { fontVars: string }

const ClayView = ({ fontVars }: ClayViewProps) => (
  <Shell className={`${css.page} ${fontVars}`}>
    <div className={css.backTag}>
      <Link url='/styles'>◀ styles</Link>
    </div>

    <section className={css.hero}>
      <p className={css.eyebrow}>plasticine social club</p>
      <h1 className={css.title}>CLAY</h1>
      <p className={css.subtitle}>
        everything here is thumb-pressed. the eyes follow you. poke responsibly.
      </p>
      <ClayCritters />
    </section>

    <section className={css.split}>
      <BlindBox />
      <div className={css.chipDemo}>
        <h2 className={css.sectionTitle}>squish buttons</h2>
        <p className={css.sectionNote}>
          claymorphism: soft inset light, soft drop, huge radius.
        </p>
        <div className={css.chipRow}>
          <button type='button' className={css.chip}>
            press me
          </button>
          <button type='button' className={`${css.chip} ${css.chipMint}`}>
            no, me
          </button>
          <button type='button' className={`${css.chip} ${css.chipLilac}`}>
            gently
          </button>
        </div>
      </div>
    </section>

    <section className={css.padSection}>
      <h2 className={css.sectionTitle}>the rolling pad</h2>
      <ClayPad />
    </section>

    <footer className={css.colophon}>
      <p>
        clay style sells softness: matte pastel, fat radii, one warm light from
        the upper left. the fingerprint is the brand.
      </p>
    </footer>
  </Shell>
)

export default ClayView
