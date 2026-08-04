import cn from 'clsx'
import SpriteBust from 'services/bust'
import manualCss from './manual.module.css'
import css from './manual-cover.module.css'
import Page from './manual-page'

export default function ManualCover() {
  return (
    <Page className={css.cover} wear='stapled'>
      <header className={css.documentHeader}>
        <p>
          <span>Personal interface unit</span>
          <strong>Operating &amp; service manual</strong>
        </p>
        <p>
          <span>Document</span>
          <strong>RS-19911201-11</strong>
        </p>
      </header>

      <div className={css.coverGrid}>
        <div className={css.coverCopy}>
          <p className={css.eyebrow}>MODEL RS–91 / HUMAN, TYPE 01</p>
          <h1 className={css.title} aria-label='Sospedra'>
            <span>SOS</span>
            <span>PE</span>
            <span>DRA</span>
          </h1>
          <p className={css.coverSummary}>
            Instructions for installation, normal operation, communication,
            maintenance and fault diagnosis. Read before first contact. Retain
            for future reference.
          </p>
          <dl className={css.specification}>
            <div>
              <dt>Accepted input</dt>
              <dd>Context + evidence</dd>
            </div>
            <div>
              <dt>Nominal output</dt>
              <dd>Software + opinions</dd>
            </div>
            <div>
              <dt>Communications</dt>
              <dd>Async / distributed</dd>
            </div>
          </dl>
        </div>

        <figure className={css.coverFigure}>
          <div className={css.bust}>
            <SpriteBust />
          </div>
          <span className={css.calloutA}>A1 / OPERATOR</span>
          <span className={css.calloutB}>CAL. 1991–12</span>
          <figcaption>FIG. 00 — FRONT ELEVATION / NOT TO SCALE</figcaption>
        </figure>
      </div>

      <div className={css.calibrationStrip}>
        <div>
          <span>CALIBRATION TRACE</span>
          <strong>CH–01 / 0.8 V</strong>
        </div>
        <svg
          className={cn(css.trace, manualCss.trace)}
          viewBox='0 0 480 72'
          role='img'
          aria-label='Stable calibration waveform'
        >
          <path d='M0 36h42l12-24 22 48 19-38 18 28 22-14h42l13-25 21 50 22-44 23 38 18-19h43l14-26 19 52 22-45 22 39 18-20h48' />
        </svg>
        <img
          alt='Sospedra inspection mark'
          src='/sospedra.png'
          className={css.logo}
        />
      </div>
    </Page>
  )
}
