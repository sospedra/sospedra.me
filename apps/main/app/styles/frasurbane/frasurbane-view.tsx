'use client'

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

type Era = '1994' | '2024'

type FrasurbaneViewProps = { fontVars: string }

const FrasurbaneView = ({ fontVars }: FrasurbaneViewProps) => {
  const [era, setEra] = useState<Era>('2024')

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <div className={css.root} data-era={era}>
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
          {era === '1994' ? 'ANTIQVITAS · MCMXCIV' : 'greek mythology'}
        </p>
        <p
          className={`${css.marginal} ${css.marginalRight}`}
          aria-hidden='true'
        >
          {era === '1994' ? 'VRBANITAS · SEATTLE' : 'petrification'}
        </p>

        <header className={css.masthead}>
          <p className={css.eyebrow}>a frasurbane reader · volume IV</p>
          <h1 className={css.title}>
            <em>Perseus</em>
            <span className={css.titleMark}>{era === '1994' ? '❧' : '✦'}</span>
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

        <article className={css.body}>
          <p className={css.lede}>
            <span className={css.dropCap}>P</span>erseus came back over the sea
            with a thing in a satchel that could not be looked at. That is the
            whole story, told politely: a loan of winged sandals, a mirror used
            as a weapon, one careful swing. Everything after is packaging — how
            to carry a catastrophe through a crowded room without turning the
            guests to stone.
          </p>
          <p>
            Canova carves the second after the sword. The hero is already
            composing himself for marble: weight settled on one hip, the
            terrible head held out like a lamp at a dinner party. The violence
            is over and the etiquette has begun. It is the most frasurbane
            gesture in sculpture — sophistication as a way of holding something
            monstrous at arm&rsquo;s length.
          </p>
          <blockquote className={css.pull}>
            sophistication is just a monster, held correctly
          </blockquote>
          <p>
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
        </article>

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
              className={css.painting}
            />
          </figure>
          <p className={css.darkCaption}>
            El Greco paints the sky the head would make: green thunder over a
            town that looked up one second too long.
          </p>
        </section>

        <footer className={css.colophon}>
          <div className={css.colophonRule}>{era === '1994' ? '❦' : '✧'}</div>
          <p className={css.colophonText}>
            set in Bodoni Moda, Cinzel &amp; EB Garamond
            {era === '2024' ? ' · defaced in UnifrakturMaguntia' : ''} — cut
            MMXXVI
          </p>
        </footer>

        <div className={css.film} aria-hidden='true' />
      </div>
    </Shell>
  )
}

export default FrasurbaneView
