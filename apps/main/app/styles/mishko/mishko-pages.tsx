import { Fragment } from 'react'
import { type MeltPalette, PALETTES } from './melt-gl'
import css from './mishko.module.css'

const DRIP_PATH = [
  'M0 48 L0 26 C28 26 36 8 66 8 C96 8 102 30 138 30 C174 30 180 5 222 5',
  'C264 5 268 27 306 27 C344 27 350 12 392 12 C434 12 440 33 486 33',
  'C532 33 538 7 588 7 C638 7 644 25 694 25 C744 25 750 12 800 12',
  'C850 12 856 31 908 31 C960 31 966 6 1020 6 C1068 6 1076 22 1122 22',
  'C1156 22 1170 14 1200 14 L1200 48 Z',
].join(' ')

export const MeltEdge = () => (
  <svg
    className={css.meltEdge}
    viewBox='0 0 1200 48'
    preserveAspectRatio='none'
    aria-hidden='true'
  >
    <path d={DRIP_PATH} fill='currentColor' />
  </svg>
)

type PlateHeadProps = { folio: string }

export const PlateHead = ({ folio }: PlateHeadProps) => (
  <header className={css.head}>
    <span>SOSPEDRA PRESS</span>
    <span>{folio}</span>
    <span className={css.headRule} aria-hidden='true' />
  </header>
)

export type ArchiveEntry = {
  n: string
  date: string
  phrase: string
  palette: MeltPalette
}

const ARCHIVE: ArchiveEntry[] = [
  { n: '058', date: '15|05|2021', phrase: 'BE THE REASON', palette: 'violet' },
  { n: '161', date: '02|08|2021', phrase: 'CHANGE HAPPENS', palette: 'oil' },
  { n: '182', date: '16|09|2021', phrase: 'GOOD VIBES', palette: 'inferno' },
  { n: '384', date: '27|01|2022', phrase: 'DON’T QUIT', palette: 'inferno' },
]

const dripGradient = (palette: MeltPalette) =>
  `linear-gradient(180deg, ${PALETTES[palette].stops.slice(0, 5).join(',')})`

const rampGradient = (palette: MeltPalette) =>
  `linear-gradient(90deg, ${PALETTES[palette].stops.join(',')})`

type ArchivePlateProps = { onReprint: (entry: ArchiveEntry) => void }

export const ArchivePlate = ({ onReprint }: ArchivePlateProps) => (
  <div className={css.plate}>
    <h2 className={css.plateTitle}>THE ARCHIVE</h2>
    <p className={css.archiveHead}>
      from the melt press, 2021–2022 — tap a plate to reprint it
    </p>
    <p className={css.archiveLede}>
      four pulls, one shader. the ramp is the only thing that changes between
      them, and it changes everything. a tap loads the original ramp and
      reprints the phrase on plate 1.
    </p>
    {ARCHIVE.map((entry, index) => (
      <button
        key={entry.n}
        type='button'
        className={css.mini}
        data-slot={index}
        data-dark={PALETTES[entry.palette].dark ? 'true' : undefined}
        style={{ background: PALETTES[entry.palette].stops.at(-1) }}
        onClick={() => onReprint(entry)}
      >
        <span className={css.miniStack} aria-hidden='true'>
          <span
            className={css.miniDrip}
            style={{ backgroundImage: dripGradient(entry.palette) }}
          >
            {entry.phrase}
          </span>
          <span
            className={css.miniWord}
            style={{ backgroundImage: dripGradient(entry.palette) }}
          >
            {entry.phrase}
          </span>
        </span>
        <span className={css.miniCap}>
          TYPOGRAPHY POSTER Nº{entry.n} · {entry.date} · “{entry.phrase}”
        </span>
      </button>
    ))}
    <ul className={css.catalog}>
      {ARCHIVE.map((entry) => (
        <li key={entry.n}>
          Nº{entry.n} — {entry.palette} ramp — {entry.date}
        </li>
      ))}
    </ul>
    <p className={`${css.margin} ${css.marginSold}`}>sold at cost</p>
    <p className={`${css.margin} ${css.marginEdition}`}>edition of none</p>
    <p className={`${css.margin} ${css.marginReprint}`}>
      reprints: tap the plate ↺
    </p>
  </div>
)

type Stage = {
  n: string
  name: string
  note: string
  kind: 'text' | 'warp' | 'lut' | 'grain'
}

const STAGES: Stage[] = [
  {
    n: '01',
    name: 'TEXT',
    note: 'the phrase prints at weight 900 onto a 1024² luminance plate',
    kind: 'text',
  },
  {
    n: '02',
    name: 'WARP',
    note: 'fbm columns pull 9 taps down the plate; pointer heat widens the drip',
    kind: 'warp',
  },
  {
    n: '03',
    name: 'GRADIENT MAP',
    note: 'the gray melt indexes a 256×1 LUT; the ramp is the only ink',
    kind: 'lut',
  },
  {
    n: '04',
    name: 'GRAIN',
    note: 'hash noise dithers the tone and a vignette presses the corners',
    kind: 'grain',
  },
]

const SETTINGS: [string, string][] = [
  ['BASE DRIP', '0.085'],
  ['MELT TAPS', '9'],
  ['HEAT DECAY', '×0.988 per frame'],
  ['DPR CAP', '≤ 1.6'],
  ['TEXT PLATE', '1024 × 1024'],
  ['HEAT GRID', '96 × 96'],
  ['LUT', '256 × 1'],
]

const SPECIMEN = [
  'float columns = fbm(vec2(uv.x * 7.0, uTime * 0.06));',
  'float wave = fbm(vec2(uv.x * 16.0 + 31.0, uv.y * 2.0 + uTime * 0.12));',
  'float drip = (0.085 + 0.34 * heat) * (0.25 + 0.75 * columns);',
  'float sway = (wave - 0.5) * (0.016 + 0.06 * heat);',
  'ink = min(ink, tap + f * 0.52);',
  'gl_FragColor = vec4(texture2D(uLut,',
  '  vec2(clamp(t, 0.01, 0.99), 0.5)).rgb, 1.0);',
].join('\n')

type StageArtProps = { kind: Stage['kind']; stops: string[] }

const StageArt = ({ kind, stops }: StageArtProps) => {
  if (kind === 'text') return <span className={css.wordArt}>MELT</span>
  if (kind === 'warp')
    return (
      <span className={css.warpStack}>
        <span className={`${css.wordArt} ${css.warpGhost}`} aria-hidden='true'>
          MELT
        </span>
        <span className={css.wordArt}>MELT</span>
      </span>
    )
  if (kind === 'lut')
    return (
      <span
        className={css.lutBar}
        style={{
          backgroundImage: `linear-gradient(180deg, ${stops.join(',')})`,
        }}
      >
        <span className={css.lutTick}>ink</span>
        <span className={css.lutTick}>paper</span>
      </span>
    )
  return <span className={css.grainBox} />
}

type RecipePlateProps = { stops: string[] }

export const RecipePlate = ({ stops }: RecipePlateProps) => (
  <div className={css.plate}>
    <h2 className={css.plateTitle}>THE RECIPE</h2>
    <p className={css.recipeDek}>
      the melt pipeline, pressed flat — four passes between a phrase and a
      poster
    </p>
    <div className={css.pipeline}>
      <span className={css.flowRule} aria-hidden='true' />
      {STAGES.map((stage, index) => (
        <Fragment key={stage.n}>
          {index > 0 && (
            <span className={css.arrow} aria-hidden='true'>
              ▸
            </span>
          )}
          <div className={css.stageCell}>
            <span className={css.stageArt}>
              <StageArt kind={stage.kind} stops={stops} />
            </span>
            <span className={css.stageNum}>{stage.n}</span>
            <span className={css.stageName}>{stage.name}</span>
            <span className={css.stageNote}>{stage.note}</span>
          </div>
        </Fragment>
      ))}
    </div>
    <p className={css.pipelineCap}>
      FIG. 1 — FOUR PASSES, ONE FRAME, EVERY FRAME
    </p>
    <section className={css.press}>
      <h3 className={css.pressHead}>PRESS SETTINGS</h3>
      <dl className={css.pressList}>
        {SETTINGS.map(([term, value]) => (
          <div key={term} className={css.pressRow}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={css.pressFoot}>
        transcribed from melt-gl.ts — the press does not tune itself
      </p>
    </section>
    <figure className={css.specimen}>
      <figcaption>FRAGMENT SHADER — VERBATIM</figcaption>
      <pre>{SPECIMEN}</pre>
    </figure>
    <p className={`${css.margin} ${css.marginRecipe}`}>
      no cmyk · no paper · one LUT
    </p>
  </div>
)

const EDITION_ROWS: [string, string][] = [
  ['EDITION', 'unlimited, none identical'],
  ['INK', 'one gradient-map LUT, three ramps'],
  ['PRESS', 'webgl 1.0, a single fragment shader'],
  ['PAPER', 'none — rub the poster and it melts again'],
]

type ColophonPlateProps = {
  palette: MeltPalette
  phrase: string
  edition: number
  stamp: string
}

export const ColophonPlate = ({
  palette,
  phrase,
  edition,
  stamp,
}: ColophonPlateProps) => (
  <div className={css.plate}>
    <h2 className={css.plateTitle}>COLOPHON</h2>
    <div className={css.copyCard}>
      <span className={css.copyLabel}>THIS COPY</span>
      <span className={css.copyPhrase}>“{phrase}”</span>
      <span className={css.copyMeta}>
        Nº{`${edition}`.padStart(3, '0')} · {stamp} · {palette} RAMP
      </span>
    </div>
    <dl className={css.edition}>
      {EDITION_ROWS.map(([term, value]) => (
        <div key={term} className={css.editionRow}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
    <p className={css.issueStamp}>
      this issue is set in the {palette} ramp. the ramp paints the poster and
      the publication both.
    </p>
    <div className={css.drawdowns}>
      {(Object.keys(PALETTES) as MeltPalette[]).map((key) => (
        <div
          key={key}
          className={css.drawdown}
          data-on={key === palette ? 'true' : undefined}
        >
          <span className={css.drawdownLabel}>
            <b>{key}</b>
            <span>
              {PALETTES[key].stops[0]} → {PALETTES[key].stops.at(-1)}
            </span>
            {key === palette && <em>▸ in use</em>}
          </span>
          <span
            className={css.drawdownBar}
            style={{ backgroundImage: rampGradient(key) }}
          />
        </div>
      ))}
    </div>
    <p className={css.gothicMark}>believe</p>
    <footer className={css.colFoot}>
      <span className={css.stampLine}>
        PRESSED, NOT PRINTED · SOSPEDRA PRESS, BCN · RUB ANY POSTER TO REMELT IT
      </span>
      <span className={css.barcode} aria-hidden='true' />
    </footer>
  </div>
)
