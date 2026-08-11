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
              <img src='/styles/eagle-pink.webp' alt='' className={css.eagle} />
              <div className={css.headlineBox}>
                <p className={css.eyebrow}>
                  OVERPRINT EFFECT · SHEET Nº1 · RUN OF 1000
                </p>
                <h1 className={css.headline}>OVERPRINT</h1>
              </div>
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
              <img
                src='/styles/beetles-blue.webp'
                alt=''
                className={css.beetles}
              />
              <div className={css.headlineBox}>
                <p className={css.eyebrow}>
                  OVERPRINT EFFECT · SHEET Nº1 · RUN OF 1000
                </p>
                <h1 className={css.headline}>OVERPRINT</h1>
              </div>
              <p className={css.plateCaption}>
                two inks, no registration — browser risography
              </p>
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
          <span className={css.mastheadName}>THE DUPLICATE</span>
          <span className={css.mastheadSub}>
            a two-ink press — ships when it ships
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
