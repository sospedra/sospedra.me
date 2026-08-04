import cn from 'clsx'
import type { ReactNode } from 'react'
import manualCss from './manual.module.css'
import css from './manual-commissioning.module.css'
import ManualKeys from './manual-keys'
import Page from './manual-page'
import sectionCss from './manual-section.module.css'
import Piece from './piece'
import SpriteManual from './sprites/sprites'

function CommissioningCheck({
  children,
  id,
}: {
  children: ReactNode
  id: string
}) {
  return (
    <li className={css.commissioningCheck}>
      <input className={css.commissioningInput} id={id} type='checkbox' />
      <label className={css.commissioningLabel} htmlFor={id}>
        <svg
          className={css.commissioningGlyph}
          width='45'
          height='45'
          viewBox='0 0 95 95'
          aria-hidden='true'
        >
          <rect
            className={css.commissioningBox}
            x='30'
            y='20'
            width='50'
            height='50'
          />
          <g transform='translate(0,-952.36222)'>
            <path
              className={cn(css.commissioningMark, manualCss.commissioningMark)}
              d='m 56,963 c -102,122 6,9 7,9 17,-5 -66,69 -38,52 122,-77 -7,14 18,4 29,-11 45,-43 23,-4'
            />
          </g>
        </svg>
        <span>{children}</span>
      </label>
    </li>
  )
}

export default function ManualCommissioning() {
  return (
    <>
      <Page className={css.safetyPage} wear='stained'>
        <header className={sectionCss.sectionHeader}>
          <span>SECTION 01</span>
          <div>
            <h2>Precautions &amp; initial setup</h2>
            <p>Read all notices before placing the unit in service.</p>
          </div>
        </header>

        <ManualKeys />

        <div className={css.commissioningGrid}>
          <section>
            <h3>1.1 Before commissioning</h3>
            <ul className={css.commissioningChecklist}>
              <CommissioningCheck id='manual-check-assumptions'>
                Remove assumptions, stale requirements and meeting residue.
              </CommissioningCheck>
              <CommissioningCheck id='manual-check-objective'>
                Supply one clear objective and the evidence needed to act.
              </CommissioningCheck>
              <CommissioningCheck id='manual-check-mode'>
                Select <b>SPEED</b> or <b>PRECISION</b>. Do not force both
                without reducing scope.
              </CommissioningCheck>
              <CommissioningCheck id='manual-check-honour'>
                Confirm the honour interlock is engaged before applying
                workload.
              </CommissioningCheck>
            </ul>
          </section>
          <aside className={css.serviceBulletin}>
            <p>
              <strong>FACTORY SERVICE BULLETIN 04-B</strong>
              <span>AUTHORIZED PERSONNEL ONLY</span>
            </p>
            <p>
              Do not disclose the{' '}
              <span
                className={sectionCss.redacted}
                role='img'
                aria-label='redacted service information'
              >
                secondary coffee protocol
              </span>{' '}
              or bypass code{' '}
              <span
                className={sectionCss.redacted}
                role='img'
                aria-label='redacted service information'
              >
                JUPITER FORTY
              </span>
              .
            </p>
          </aside>
        </div>

        <div className={css.warningGrid}>
          <div>
            <p className={css.warningTitle}>
              <b>WARNING</b>
              <span>EN / 01</span>
            </p>
            <p>
              Serious or fatal emotion injuries can occur from not reading this
              document in advance. To prevent this situation you must
              acknowledge what's on the manual with the included attached pun
              jokes.
            </p>
          </div>
          <div lang='ca'>
            <p className={css.warningTitle}>
              <b>ATENCIÓ</b>
              <span>CA / 02</span>
            </p>
            <p>
              Risc de lesions emocionals series o fatals és poden produir si no
              es llegeix aquest document. Per prevenir aquesta situación vosté
              ha de comprendre allò qué está escrit en el manual. Incloses les
              bromes dolentes.
            </p>
          </div>
          <div lang='es'>
            <p className={css.warningTitle}>
              <b>ADVERTENCIA</b>
              <span>ES / 03</span>
            </p>
            <p>
              Pueden producirse lesiones emocionales graves o fatales si no lee
              este documento. Para evitar dicha situación, debe entenderse lo
              que se encuentra escrito en el manual. Incluidas las bromas
              adjuntas.
            </p>
          </div>
        </div>
      </Page>

      <Page className={css.partsPage} wear='folded'>
        <header className={sectionCss.sectionHeader}>
          <span>SECTION 02</span>
          <div>
            <h2>Illustrated component inventory</h2>
            <p>Confirm component count before placing the unit in service.</p>
          </div>
        </header>
        <div className={css.partsGrid}>
          <Piece quantity={19} id={101811}>
            <SpriteManual name='demons' />
          </Piece>
          <Piece quantity={91} id={101933}>
            <SpriteManual name='triangle' />
          </Piece>
          <Piece quantity={12} id={102053}>
            <SpriteManual name='insert' />
          </Piece>
          <Piece quantity={1} id={101697}>
            <SpriteManual name='mobius' />
            <span className={css.penTally} aria-hidden='true'>
              only one??
            </span>
          </Piece>
          <div className={css.widePart}>
            <Piece quantity={11} id={102287}>
              <SpriteManual name='count' />
            </Piece>
          </div>
        </div>
      </Page>
    </>
  )
}
