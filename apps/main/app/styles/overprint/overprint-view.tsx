'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import InkFilters from './ink-filters'
import css from './overprint.module.css'

const LEGEND = [
  'FIG. 01 — polilla, plancha rayada',
  'FIG. 02 — mariposa calcada dos veces',
  'FIG. 03 — escarabajo, tinta cargada',
  'FIG. 04 — el que se movió durante el escaneo',
]

const GAZETTE =
  'Confirman los talleres que la plancha rosa entró torcida y nadie detuvo la tirada. ' +
  'El regente declaró que el error era, visto de cerca, bastante mejor que el original. ' +
  'Se imprimieron mil pliegos y se vendieron mil pliegos. '

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
      <InkFilters />
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
              <img src='/styles/eagle.jpg' alt='' className={css.eagle} />
              <div className={css.headlineBox}>
                <p className={css.eyebrow}>
                  EFECTO SOBREIMPRESIÓN · PLIEGO Nº1 · TIRADA 1000
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
              <img src='/styles/beetles.jpg' alt='' className={css.beetles} />
              <div className={css.headlineBox}>
                <p className={css.eyebrow}>
                  EFECTO SOBREIMPRESIÓN · PLIEGO Nº1 · TIRADA 1000
                </p>
                <h1 className={css.headline}>OVERPRINT</h1>
              </div>
              <p className={css.plateCaption}>
                dos tintas sin registro — risografía de navegador
              </p>
              <span className={`${css.cross} ${css.crossTl}`}>✛</span>
              <span className={`${css.cross} ${css.crossBr}`}>✛</span>
            </div>
          )}
        </div>
        <p className={css.pressHint}>
          mueve el puntero: las planchas pierden el registro
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
          ROSA
        </label>
        <label className={css.puck} data-ink='blue'>
          <input
            type='checkbox'
            checked={blueOn}
            onChange={() => setBlueOn((v) => !v)}
          />
          <span className={css.puckDot} aria-hidden='true' />
          AZUL
        </label>
        <label className={css.spreadLabel}>
          DESCUADRE {spread}px
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
          ¡MISPRINT!
        </button>
      </div>

      <section className={css.sheet}>
        <header className={css.sheetHead}>
          <h2 className={css.sheetTitle}>LÁMINA I — INSECTOS DE ARCHIVO</h2>
          <span className={css.stamp}>APROBADO</span>
        </header>
        <figure className={css.specimen}>
          <img
            src='/styles/beetles.jpg'
            alt='Wenceslaus Hollar etching: a moth, three butterflies and two beetles, printed in teal ink'
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
        <h2 className={css.morgueTitle}>ANATOMÍA DEL ERROR</h2>
        <p className={css.morgueNote}>
          el escáner arrastró la tinta y nadie paró la máquina
        </p>
        <div className={css.smearRow}>
          {(['a', 'b', 'c'] as const).map((grade) => (
            <div key={grade} className={css.smearCol} data-smear={grade}>
              <img src='/styles/vesalius.jpg' alt='' className={css.bones} />
              <img
                src='/styles/vesalius.jpg'
                alt=''
                className={css.bonesGhost}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={css.gazette}>
        <header className={css.masthead}>
          <span className={css.mastheadName}>EL DUPLICADO</span>
          <span className={css.mastheadSub}>
            prensa de dos tintas — sale cuando sale
          </span>
        </header>
        <div className={css.gazetteBody}>
          <img
            src='/styles/posada.jpg'
            alt='Posada calavera etching printed in red ink'
            className={css.calavera}
          />
          <p className={css.vertHead} aria-hidden='true'>
            TODO SALE MAL
          </p>
          <p className={css.columnText}>{GAZETTE.repeat(3)}</p>
        </div>
      </section>

      <footer className={css.colophon}>
        <img
          src='/styles/rhino.jpg'
          alt='Dürer rhinoceros woodcut in blue ink'
          className={css.rhino}
        />
        <p>
          impreso dos veces sin permiso · tintas 0078BF / FF48B0 · sospedra
          press, 2026
        </p>
      </footer>

      <div className={css.film} aria-hidden='true' />
    </Shell>
  )
}

export default OverprintView
