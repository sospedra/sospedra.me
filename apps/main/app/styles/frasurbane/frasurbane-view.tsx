'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import css from './frasurbane.module.css'

const SPARKLES = [
  { x: 8, y: 12, d: 0 },
  { x: 88, y: 8, d: 600 },
  { x: 14, y: 78, d: 1200 },
  { x: 92, y: 64, d: 300 },
  { x: 74, y: 88, d: 900 },
  { x: 26, y: 40, d: 1500 },
  { x: 48, y: 6, d: 1800 },
  { x: 6, y: 52, d: 2100 },
  { x: 94, y: 30, d: 450 },
  { x: 60, y: 94, d: 1350 },
]

const Astrolabe = () => (
  <svg
    viewBox='0 0 320 320'
    className={`${css.behind} ${css.astrolabe}`}
    aria-hidden='true'
  >
    <circle cx='160' cy='160' r='150' fill='none' strokeWidth='1.5' />
    <circle
      cx='160'
      cy='160'
      r='118'
      fill='none'
      strokeWidth='1'
      strokeDasharray='2 7'
    />
    <circle cx='160' cy='160' r='74' fill='none' strokeWidth='1' />
    <line x1='24' y1='250' x2='296' y2='70' strokeWidth='1' />
    <circle cx='236' cy='110' r='7' />
    <circle cx='84' cy='210' r='4' />
    <circle cx='160' cy='160' r='2.5' />
  </svg>
)

const BURST_POINTS = Array.from({ length: 32 }, (_, i) => {
  const angle = (Math.PI * i) / 16
  const radius = i % 2 === 0 ? 155 : 52
  return `${(160 + radius * Math.cos(angle)).toFixed(1)},${(160 + radius * Math.sin(angle)).toFixed(1)}`
}).join(' ')

const Burst = () => (
  <svg
    viewBox='0 0 320 320'
    className={`${css.behind} ${css.burst}`}
    aria-hidden='true'
  >
    <polygon points={BURST_POINTS} />
  </svg>
)

const Orbit = () => (
  <svg viewBox='0 0 120 90' className={css.orbit} aria-hidden='true'>
    <circle
      cx='74'
      cy='45'
      r='34'
      fill='none'
      strokeWidth='1'
      strokeDasharray='3 5'
    />
    <circle cx='74' cy='45' r='18' fill='none' strokeWidth='1' />
    <circle cx='74' cy='11' r='4' />
    <circle cx='92' cy='45' r='2.5' />
    <line x1='0' y1='45' x2='40' y2='45' strokeWidth='1' />
  </svg>
)

const ROSETTE_DOTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (Math.PI * i) / 6
  return { cx: 30 + 22 * Math.cos(angle), cy: 30 + 22 * Math.sin(angle) }
})

const Rosette = () => (
  <svg viewBox='0 0 60 60' className={css.rosette} aria-hidden='true'>
    <circle cx='30' cy='30' r='13' fill='none' strokeWidth='1.4' />
    {ROSETTE_DOTS.map((dot) => (
      <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r='3' />
    ))}
  </svg>
)

const MotifAstrolabe = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <circle cx='24' cy='24' r='19' fill='none' />
    <circle cx='24' cy='24' r='11' fill='none' strokeDasharray='2 4' />
    <line x1='8' y1='36' x2='40' y2='12' />
    <circle cx='33' cy='17' r='2.4' className={css.motifFill} />
  </svg>
)

const MotifColumn = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <path d='M14 10h20M16 14h16M14 38h20M16 34h16' />
    <line x1='20' y1='14' x2='20' y2='34' />
    <line x1='24' y1='14' x2='24' y2='34' />
    <line x1='28' y1='14' x2='28' y2='34' />
  </svg>
)

const MotifArch = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <path d='M12 40V22q12-16 24 0v18' fill='none' />
    <path d='M8 40h32' />
    <path d='M16 40V23.5q8-11 16 0V40' fill='none' />
  </svg>
)

const MotifLaurel = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <path d='M24 40V12' fill='none' />
    <path
      d='M24 34q-9-2-11-10 9 1 11 10zM24 34q9-2 11-10-9 1-11 10zM24 24q-8-2-9-9 7 1 9 9zM24 24q8-2 9-9-7 1-9 9z'
      className={css.motifFill}
    />
  </svg>
)

const MotifCoffee = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <path d='M12 20h20v8a10 10 0 0 1-20 0z' fill='none' />
    <path d='M32 22h4a4 4 0 0 1 0 8h-4' fill='none' />
    <path d='M10 42h26' />
    <path d='M19 14q-2-3 0-6M26 14q-2-3 0-6' fill='none' />
  </svg>
)

const MotifGlobe = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <circle cx='24' cy='22' r='14' fill='none' />
    <ellipse cx='24' cy='22' rx='6' ry='14' fill='none' />
    <line x1='10' y1='22' x2='38' y2='22' />
    <path d='M15 34l-4 8M33 34l4 8M14 42h20' />
  </svg>
)

type Motif = { numeral: string; name: string; art: ReactNode }

const MOTIFS: Motif[] = [
  { numeral: 'I', name: 'astrolabe', art: MotifAstrolabe },
  { numeral: 'II', name: 'column', art: MotifColumn },
  { numeral: 'III', name: 'arch', art: MotifArch },
  { numeral: 'IV', name: 'laurel', art: MotifLaurel },
  { numeral: 'V', name: 'coffee', art: MotifCoffee },
  { numeral: 'VI', name: 'globe', art: MotifGlobe },
]

const TICKS = [
  { year: '1989', label: 'the look is born' },
  { year: '1993', label: 'Frasier premieres' },
  { year: '1998', label: 'peak crate & twine' },
  { year: '2004', label: 'retail fade-out' },
  { year: '2024', label: 'the gothic remix' },
]

type Era = '1994' | '2024'

type EraDecor = {
  folioMark: string
  titleMark: string
  divider: string
  colophonMark: string
  marginalLeft: string
  marginalRight: string
  defaced: string
}

const ERA_DECOR: Record<Era, EraDecor> = {
  '1994': {
    folioMark: '\u2766',
    titleMark: '\u2767',
    divider: '\u2767 \u2766 \u2767',
    colophonMark: '\u2766',
    marginalLeft: 'ANTIQVITAS \u00b7 MCMXCIV',
    marginalRight: 'VRBANITAS \u00b7 SEATTLE',
    defaced: '',
  },
  '2024': {
    folioMark: '\u2726',
    titleMark: '\u2726',
    divider: '\u2727 \u2726 \u2727',
    colophonMark: '\u2727',
    marginalLeft: 'greek mythology',
    marginalRight: 'petrification',
    defaced: ' \u00b7 defaced in UnifrakturMaguntia',
  },
}

type FrasurbaneViewProps = { fontVars: string }

const FrasurbaneView = ({ fontVars }: FrasurbaneViewProps) => {
  const [era, setEra] = useState<Era>('2024')
  const decor = ERA_DECOR[era]

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <div className={css.root} data-era={era}>
        <div className={css.pageFrame} aria-hidden='true' />

        <div className={css.backTag}>
          <Link url='/styles'>◀ styles</Link>
        </div>

        <div className={css.eraDock}>
          <button
            type='button'
            role='switch'
            aria-checked={era === '2024'}
            aria-label='Flip between the 1994 original and the 2024 remix'
            className={css.eraSwitch}
            onClick={() => setEra(era === '1994' ? '2024' : '1994')}
          >
            <span data-active={era === '1994' ? 'true' : undefined}>1994</span>
            <span className={css.eraSlash}>⁄</span>
            <span data-active={era === '2024' ? 'true' : undefined}>2024</span>
          </button>
          <p className={css.eraNote}>one layout, two decades</p>
        </div>

        <p className={`${css.marginal} ${css.marginalLeft}`} aria-hidden='true'>
          {decor.marginalLeft}
        </p>
        <p
          className={`${css.marginal} ${css.marginalRight}`}
          aria-hidden='true'
        >
          {decor.marginalRight}
        </p>

        <header className={css.folio}>
          <span>A FRASURBANE READER · VOL. IV</span>
          <span className={css.folioMark}>{decor.folioMark}</span>
          <span className={css.folioRight}>AUGUST MMXXVI</span>
        </header>

        <header className={css.masthead}>
          {era === '2024' && (
            <>
              <span
                className={`${css.mastSpark} ${css.mastSparkA}`}
                aria-hidden='true'
              >
                ✧
              </span>
              <span
                className={`${css.mastSpark} ${css.mastSparkB}`}
                aria-hidden='true'
              >
                ✧
              </span>
            </>
          )}
          <p className={css.eyebrow}>the classical issue</p>
          <h1 className={css.title}>
            <em>Perseus</em>
            <span className={css.titleMark}>{decor.titleMark}</span>
          </h1>
          <p className={css.subtitle}>and the head of Medusa</p>
          <div className={css.rule} />
        </header>

        <section className={css.plateSection}>
          <div className={css.cartouche}>
            {era === '1994' ? <Astrolabe /> : <Burst />}
            <figure className={css.arch}>
              <img
                src='/styles/perseus.jpg'
                alt='Antonio Canova, Perseus with the Head of Medusa, marble, 1804'
                className={css.statue}
              />
            </figure>
            <aside className={css.annotation}>
              <Orbit />
              <p className={css.annotationText}>
                Canova · MDCCCIV
                <br />
                marble, after the bronze of Cellini
              </p>
            </aside>
          </div>
        </section>

        <div className={css.divider} aria-hidden='true'>
          {decor.divider}
        </div>

        <article className={css.body}>
          <aside className={css.sidenote} data-slot='a'>
            the sandals were a loan from Hermes; the mirror, from Athena. taste
            is mostly borrowed equipment.
          </aside>
          <aside className={css.sidenote} data-slot='b'>
            see also: the espresso machine, the jazz shelf, the framed print of
            this exact page.
          </aside>
          <p className={css.lede}>
            <span className={css.dropCap}>P</span>erseus came back over the sea
            with a thing in a satchel that could not be looked at. That is the
            whole story, told politely: a loan of winged sandals, a mirror used
            as a weapon, one careful swing. Everything after is packaging — how
            to carry a catastrophe through a crowded room without turning the
            guests to stone.
          </p>
          <p className={css.sectionOpen}>
            Canova carves the second after the sword. The hero is already
            composing himself for marble: weight settled on one hip, the
            terrible head held out like a lamp at a dinner party. The violence
            is over and the etiquette has begun. It is the most frasurbane
            gesture in sculpture — sophistication as a way of holding something
            monstrous at arm&rsquo;s length.✝
          </p>
          <blockquote className={css.pull}>
            sophistication is just a monster, held correctly
          </blockquote>
          <p className={css.sectionOpen}>
            The reader of 1994 hangs this print above a leather armchair,
            between the espresso machine and the jazz shelf. The reader of 2024
            scans it, crushes the blacks, letters it in fraktur and posts it at
            midnight. Same statue. Same appetite for the classical. Only the
            anxiety is new.
          </p>
          <p className={css.footnote}>
            ✝ «frasurbane» — coined in the orbit of the Consumer Aesthetics
            Research Institute: Frasier + urbane, the upscale grammar of 1990s
            taste.
          </p>
          <p className={css.jump}>
            continued on plate II, the weather section →
          </p>
          <aside className={css.citation}>
            <span className={css.citationKey}>cite this plate</span>
            <p className={css.citationBody}>
              Sospedra, Rubén. “Perseus and the Head of Medusa.”{' '}
              <em>A Frasurbane Reader</em>, vol. IV, August MMXXVI, plate I.
            </p>
          </aside>
        </article>

        <section className={css.motifs}>
          <header className={css.motifHead}>an index of props</header>
          <ul className={css.motifGrid}>
            {MOTIFS.map((motif) => (
              <li key={motif.numeral} className={css.motifCell}>
                <span className={css.motifIcon}>{motif.art}</span>
                <span className={css.motifNum}>{motif.numeral}</span>
                <span className={css.motifName}>{motif.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={css.eraLine}>
          <h2 className={css.eraLineTitle}>the aesthetic&rsquo;s run</h2>
          <div className={css.timeline}>
            {TICKS.map((tick) => (
              <div key={tick.year} className={css.tick} data-year={tick.year}>
                <span className={css.tickDot} aria-hidden='true' />
                <span className={css.tickYear}>{tick.year}</span>
                <span className={css.tickLabel}>{tick.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={css.dark}>
          {era === '2024' &&
            SPARKLES.map((sparkle) => (
              <span
                key={`${sparkle.x}-${sparkle.y}`}
                className={css.sparkle}
                style={{
                  left: `${sparkle.x}%`,
                  top: `${sparkle.y}%`,
                  animationDelay: `${sparkle.d}ms`,
                }}
                aria-hidden='true'
              >
                ✦
              </span>
            ))}
          {era === '2024' && (
            <>
              <span className={`${css.rosetteSpot} ${css.rosetteTl}`}>
                <Rosette />
              </span>
              <span className={`${css.rosetteSpot} ${css.rosetteBr}`}>
                <Rosette />
              </span>
            </>
          )}
          <h2 className={css.darkTitle}>
            <em>the gorgon&rsquo;s weather</em>
          </h2>
          <figure className={css.frame}>
            <img
              src='/styles/toledo.jpg'
              alt='El Greco, View of Toledo: a storm-green sky boiling over a hill town'
              loading='lazy'
              className={css.painting}
            />
          </figure>
          <p className={css.darkCaption}>
            El Greco paints the sky the head would make: green thunder over a
            town that looked up one second too long.
          </p>
          <div className={css.dots} aria-hidden='true'>
            <span className={`${css.dot} ${css.dotFill}`} />
            <span className={`${css.dot} ${css.dotFill}`} />
            <span className={css.dot} />
            <span className={css.dot} />
            <span className={css.dot} />
            <span className={css.dot} />
            <span className={css.dot} />
          </div>
        </section>

        <footer className={css.colophon}>
          <div className={css.colophonRule}>{decor.colophonMark}</div>
          <p className={css.colophonText}>
            set in Bodoni Moda, Cinzel &amp; EB Garamond
            {decor.defaced} — cut MMXXVI
          </p>
          <p className={css.colophonFolio}>
            VOL. IV · PAGE I OF I · PRINTED NOWHERE
          </p>
        </footer>

        <div className={css.film} aria-hidden='true' />
      </div>
    </Shell>
  )
}

export default FrasurbaneView
