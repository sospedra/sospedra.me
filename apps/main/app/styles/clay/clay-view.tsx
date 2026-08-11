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
          : 'press the box. no refunds, no duplicates, no promises.'}
      </p>
    </div>
  )
}

type ZoneHeadProps = { index: string; title: string; note: string }

const ZoneHead = ({ index, title, note }: ZoneHeadProps) => (
  <header className={css.zoneHead}>
    <span className={css.zoneIndex}>{index}</span>
    <h2 className={css.zoneTitle}>{title}</h2>
    <span className={css.zoneNote}>{note}</span>
  </header>
)

type ClayViewProps = { fontVars: string }

const ClayView = ({ fontVars }: ClayViewProps) => (
  <Shell className={`${css.page} ${fontVars}`}>
    <div className={css.backTag}>
      <Link url='/styles'>◀ styles</Link>
    </div>

    <header className={css.folio}>
      <span>THE PLASTICINE REVIEW</span>
      <span className={css.folioRight}>ISSUE Nº 01 · AUG 2026</span>
    </header>

    <section className={css.cover}>
      <p className={css.eyebrow}>plasticine social club</p>
      <h1 className={css.title}>CLAY</h1>
      <p className={css.subtitle}>
        everything in this issue is thumb-pressed. the eyes follow you. poke
        responsibly.
      </p>
    </section>

    <figure className={css.plate}>
      <img
        src='/styles/clay-hero.jpg'
        alt='Three plasticine mascots on a salmon studio floor: a mint cat, a lilac ghost blob and a butter creature hugging a star'
        className={css.plateImg}
      />
      <figcaption className={css.plateCap}>
        <span>fig. 01 — the residents, fresh from the mould. do not bake.</span>
        <span className={css.capPage}>p. 01</span>
      </figcaption>
    </figure>

    <section className={css.zone}>
      <ZoneHead
        index='01'
        title='the petting zoo'
        note='press a resident. they forgive fast.'
      />
      <ClayCritters />
    </section>

    <figure className={css.plate}>
      <img
        src='/styles/clay-crew.jpg'
        alt='Five clay shape characters in a lineup: pentagon, square, pebble, ball and diamond, with tiny clay props floating above'
        loading='lazy'
        className={css.plateImg}
      />
      <figcaption className={css.plateCap}>
        <span>fig. 02 — season one cast. five shapes, zero lore.</span>
        <span className={css.capPage}>p. 02</span>
      </figcaption>
    </figure>

    <section className={css.zone}>
      <ZoneHead
        index='02'
        title='the vending corner'
        note='one box, four possible souls.'
      />
      <div className={css.split}>
        <BlindBox />
        <figure className={`${css.plate} ${css.plateTight}`}>
          <img
            src='/styles/clay-icons.jpg'
            alt='A grid of nine clay icons on cream tiles over lavender: star, heart, bolt, flower, arrow, padlock, sun, ghost and check mark'
            loading='lazy'
            className={css.plateImg}
          />
          <figcaption className={css.plateCap}>
            <span>fig. 03 — the icon tray, straight from the oven.</span>
            <span className={css.capPage}>p. 03</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <section className={css.zone}>
      <ZoneHead
        index='03'
        title='roll your own'
        note='every stroke is a fresh rope. smash it when done.'
      />
      <ClayPad />
    </section>

    <aside className={css.ad}>
      <span className={css.adLabel}>advertisement</span>
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
      <p className={css.adCopy}>
        squish buttons™ — the only buttons that apologize when pressed.
      </p>
    </aside>

    <footer className={css.colophon}>
      <p className={css.colophonText}>
        printed in soft focus · fingerprints are a feature, not a defect ·
        sospedra press
      </p>
    </footer>
  </Shell>
)

export default ClayView
