'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import SmearFilters from './ink-filters'
import css from './overprint.module.css'

const LEGEND = [
  'FIG. 01 — moth, scratched plate',
  'FIG. 02 — butterfly, printed twice',
  'FIG. 03 — beetle, ink too heavy',
  'FIG. 04 — the one that moved mid-scan',
]

const GAZETTE =
  'The pressroom confirms the pink plate went in crooked and nobody stopped the run. ' +
  'The foreman declared the mistake, seen up close, considerably better than the original. ' +
  'A thousand sheets were printed and a thousand sheets were sold. '

const FrontPage = () => (
  <div className={css.npSheet}>
    <p className={css.npFolio}>
      <span>VOL. II · Nº 44</span>
      <span>TUESDAY, AUGUST 11, 2026</span>
      <span>PRICE: TWO INKS</span>
    </p>
    <p className={css.npName}>THE DUPLICATE</p>
    <p className={css.npMotto}>all the news that fits, twice</p>
    <h1 className={css.npHead}>
      REGISTRATION LOST AT DAWN; PRESSROOM CELEBRATES
    </h1>
    <p className={css.npDeck}>
      every line on this page is printed once in pink and once in blue — the
      eagle escaped the second pass — the foreman calls the drift “a feature,
      finally”
    </p>
    <div className={css.npCols}>
      <div className={css.npCol}>
        <p>
          <span className={css.npDrop}>T</span>he morning run started in perfect
          register, which the staff agreed was suspicious. By the fourth sheet
          the pink plate had slipped a half-point south, and by the fortieth the
          blue had wandered east in sympathy.
        </p>
        <p>
          Nobody reached for the stop lever. Witnesses describe the crew leaning
          closer with every pass, the fringes growing warmer, the paper filling
          with weather.
        </p>
      </div>
      <div className={css.npCol}>
        <img src='/styles/eagle-pink.webp' alt='' className={css.npArt} />
        <p className={css.npCut}>
          the eagle, mid-escape, in fugitive pink. plate 181, reformed.
        </p>
        <p>
          Management has scheduled an inquiry for whenever the ink runs out. The
          inquiry is expected to be printed twice and read once.
        </p>
      </div>
      <div className={css.npCol}>
        <blockquote className={css.npQuote}>
          “if it lines up, it is not art.”
        </blockquote>
        <p>
          Subscribers are reminded that a clean copy, should one exist, would be
          a misprint of the misprint and must be returned to the press for
          correction.
        </p>
        <div className={css.npBrief}>
          IN OTHER NEWS: the beetles remain very still — page 2
        </div>
      </div>
    </div>
  </div>
)

type OverprintViewProps = { fontVars: string }

const OverprintView = ({ fontVars }: OverprintViewProps) => {
  const [blueOn, setBlueOn] = useState(true)
  const [pinkOn, setPinkOn] = useState(true)
  const [spread, setSpread] = useState(6)
  const [jolt, setJolt] = useState(0)

  const aim = (event: React.PointerEvent<HTMLElement>) => {
    const el = event.currentTarget
    const rect = el.getBoundingClientRect()
    const nx = (event.clientX - rect.left) / rect.width - 0.5
    const ny = (event.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--reg-x', `${(nx * spread * 2).toFixed(1)}px`)
    el.style.setProperty('--reg-y', `${(ny * spread * 1.2).toFixed(1)}px`)
  }

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <SmearFilters />
      <div className={css.backTag}>
        <Link url='/styles'>◀ STYLES</Link>
      </div>

      <section
        className={css.press}
        onPointerMove={aim}
        style={{ '--spread': `${spread}px` } as React.CSSProperties}
      >
        <div
          key={jolt}
          className={css.plates}
          data-jolted={jolt > 0 ? 'true' : undefined}
        >
          {pinkOn && (
            <div className={`${css.plate} ${css.platePink}`}>
              <FrontPage />
              <img
                src='/styles/beetles-blue.webp'
                alt=''
                className={css.beetles}
              />
              <span
                className={`${css.cross} ${css.crossTl}`}
                aria-hidden='true'
              >
                ✛
              </span>
              <span
                className={`${css.cross} ${css.crossBr}`}
                aria-hidden='true'
              >
                ✛
              </span>
            </div>
          )}
          {blueOn && (
            <div className={`${css.plate} ${css.plateBlue}`} aria-hidden='true'>
              <FrontPage />
              <img
                src='/styles/beetles-blue.webp'
                alt=''
                className={css.beetles}
              />
              <span className={`${css.cross} ${css.crossTl}`}>✛</span>
              <span className={`${css.cross} ${css.crossBr}`}>✛</span>
            </div>
          )}
        </div>
        <p className={css.pressHint}>
          move the pointer — the plates lose register
        </p>
      </section>

      <div className={css.desk}>
        <label className={css.puck} data-ink='pink'>
          <input
            type='checkbox'
            checked={pinkOn}
            onChange={() => setPinkOn((v) => !v)}
          />
          <span className={css.puckDot} aria-hidden='true' />
          PINK
        </label>
        <label className={css.puck} data-ink='blue'>
          <input
            type='checkbox'
            checked={blueOn}
            onChange={() => setBlueOn((v) => !v)}
          />
          <span className={css.puckDot} aria-hidden='true' />
          BLUE
        </label>
        <label className={css.spreadLabel}>
          SPREAD {spread}px
          <input
            type='range'
            min={0}
            max={18}
            value={spread}
            onChange={(event) => setSpread(Number(event.target.value))}
          />
        </label>
        <button
          type='button'
          className={css.misprintBtn}
          onClick={() => setJolt((n) => n + 1)}
        >
          MISPRINT!
        </button>
      </div>

      <section className={css.sheet}>
        <header className={css.sheetHead}>
          <h2 className={css.sheetTitle}>PLATE I — ARCHIVE INSECTS</h2>
          <span className={css.stamp}>APPROVED</span>
        </header>
        <figure className={css.specimen}>
          <img
            src='/styles/beetles-teal.webp'
            alt='Wenceslaus Hollar etching: a moth, three butterflies and two beetles, printed in teal ink'
            loading='lazy'
            className={css.specimenPlate}
          />
          <figcaption className={css.legend}>
            {LEGEND.map((line) => (
              <span key={line} className={css.legendRow}>
                {line}
              </span>
            ))}
          </figcaption>
        </figure>
      </section>

      <section className={css.morgue}>
        <h2 className={css.morgueTitle}>ANATOMY OF A MISPRINT</h2>
        <p className={css.morgueNote}>
          the scanner dragged the ink and nobody stopped the machine
        </p>
        <div className={css.smearRow}>
          {(['a', 'b', 'c'] as const).map((grade) => (
            <div key={grade} className={css.smearCol} data-smear={grade}>
              <img
                src='/styles/vesalius-black.webp'
                alt=''
                loading='lazy'
                className={css.bones}
              />
              <img
                src='/styles/vesalius-red.webp'
                alt=''
                loading='lazy'
                className={css.bonesGhost}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={css.gazette}>
        <header className={css.masthead}>
          <span className={css.mastheadName}>SUNDAY SUPPLEMENT</span>
          <span className={css.mastheadSub}>
            society pages — everything prints wrong eventually
          </span>
        </header>
        <div className={css.gazetteBody}>
          <img
            src='/styles/posada-red.webp'
            alt='Posada calavera etching printed in red ink'
            loading='lazy'
            className={css.calavera}
          />
          <p className={css.vertHead} aria-hidden='true'>
            ALL PRINTS WRONG
          </p>
          <p className={css.columnText}>{GAZETTE.repeat(3)}</p>
        </div>
      </section>

      <footer className={css.colophon}>
        <img
          src='/styles/rhino-blue.webp'
          alt='Dürer rhinoceros woodcut in blue ink'
          loading='lazy'
          className={css.rhino}
        />
        <p>
          printed twice without permission · inks 0078BF / FF48B0 · sospedra
          press, 2026
        </p>
      </footer>

      <div className={css.film} aria-hidden='true' />
    </Shell>
  )
}

export default OverprintView
