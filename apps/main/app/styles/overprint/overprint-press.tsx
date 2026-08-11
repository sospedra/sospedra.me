'use client'

import type React from 'react'
import { useState } from 'react'
import css from './overprint.module.css'

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const

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
          IN OTHER NEWS: the beetles remain very still — plate II
        </div>
      </div>
    </div>
  </div>
)

const InkPlate = () => (
  <>
    <FrontPage />
    <img src='/styles/beetles-blue.webp' alt='' className={css.beetles} />
    {CORNERS.map((corner) => (
      <span
        key={corner}
        className={css.plateCross}
        data-corner={corner}
        aria-hidden='true'
      >
        ✛
      </span>
    ))}
  </>
)

const PressPlate = () => {
  const [pinkOn, setPinkOn] = useState(true)
  const [blueOn, setBlueOn] = useState(true)
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
    <div className={css.pressWrap}>
      <section className={css.press} onPointerMove={aim}>
        <div
          key={jolt}
          className={css.plates}
          data-jolted={jolt > 0 ? 'true' : undefined}
        >
          {pinkOn && (
            <div className={`${css.plate} ${css.platePink}`}>
              <InkPlate />
            </div>
          )}
          {blueOn && (
            <div className={`${css.plate} ${css.plateBlue}`} aria-hidden='true'>
              <InkPlate />
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
    </div>
  )
}

export default PressPlate
