import css from './overprint.module.css'

type TwiceProps = { text: string; ink?: 'pink' | 'blue' | 'red' }

export const Twice = ({ text, ink = 'pink' }: TwiceProps) => (
  <span className={css.twice}>
    {text}
    <span className={css.twiceGhost} data-ink={ink} aria-hidden='true'>
      {text}
    </span>
  </span>
)

const LEGEND = [
  { fig: 'FIG. 01', name: 'moth, scratched plate', ref: 'pl. 44' },
  { fig: 'FIG. 02', name: 'butterfly, printed twice', ref: 'pl. 45' },
  { fig: 'FIG. 03', name: 'beetle, ink too heavy', ref: 'pl. 47' },
  { fig: 'FIG. 04', name: 'the one that moved mid-scan', ref: 'pl. 51' },
] as const

const PRESS_LOG = [
  { time: '06:12', note: 'pink drum overfed. the foreman shrugged.' },
  { time: '06:40', note: 'teal mixed from leftover blue. logged as blue.' },
  { time: '07:03', note: 'sheet 214 ate a moth. the run continued.' },
] as const

const INK_CHIPS = ['pink', 'blue', 'teal', 'red'] as const

export const InsectsPlate = () => (
  <div className={css.insects}>
    <header className={css.insectsHead}>
      <p className={css.plateKicker}>
        PLATE I — LEPIDOPTERA, HELD AT 60 PER CENT
      </p>
      <h2 className={css.insectsTitle}>
        <Twice text='ARCHIVE INSECTS' ink='pink' />
      </h2>
    </header>

    <aside className={css.lGutter}>
      <span className={css.gutterKey}>l-gutter</span>
      plate held at 60 per cent. the teal ran long on the second pass and nobody
      logged it. the moth is the honest one.
    </aside>

    <figure className={css.specimen}>
      <img
        src='/styles/beetles-teal.webp'
        alt='Wenceslaus Hollar etching: a moth, three butterflies and two beetles, printed in teal ink'
        loading='lazy'
        className={css.specimenPlate}
      />
      <figcaption className={css.legend}>
        {LEGEND.map((row) => (
          <span key={row.fig} className={css.legendRow}>
            <span className={css.legendName}>
              {row.fig} — {row.name}
            </span>
            <span className={css.leader} aria-hidden='true' />
            <span className={css.legendRef}>{row.ref}</span>
          </span>
        ))}
      </figcaption>
      <span className={css.stamp}>APPROVED</span>
    </figure>

    <aside className={css.pressLog}>
      <p className={css.pressLogHead}>PRESS LOG</p>
      {PRESS_LOG.map((entry) => (
        <p key={entry.time} className={css.logRow}>
          <span className={css.logTime}>{entry.time}</span>
          {entry.note}
        </p>
      ))}
      <p className={css.inkRow}>
        <span className={css.inkKey}>INKS THIS ISSUE</span>
        {INK_CHIPS.map((ink) => (
          <span key={ink} className={css.inkChip} data-ink={ink} />
        ))}
      </p>
    </aside>
  </div>
)

export const MisprintPlate = () => (
  <div className={css.morgue}>
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
    <h2 className={css.morgueTitle}>
      <Twice text='ANATOMY OF A MISPRINT' ink='pink' />
    </h2>
    <p className={css.scanNote}>
      SCANNED AT 300 DPI · DRAG NOT CORRECTED · RUN NOT STOPPED
    </p>
    <p className={css.captionStrip}>
      fig. a — light drag · fig. b — the roller slipped · fig. c — the scanner
      gave up · plates 181–183, sold as printed
    </p>
  </div>
)

const GAZETTE =
  'The pressroom confirms the pink plate went in crooked and nobody stopped the run. ' +
  'The foreman declared the mistake, seen up close, considerably better than the original. ' +
  'A thousand sheets were printed and a thousand sheets were sold. '

const CREDITS = [
  { role: 'PUBLISHER', name: 'the duplicate press' },
  { role: 'FOREMAN', name: 'unnamed, still celebrating' },
  { role: 'INKS', name: '0078BF over FF48B0' },
  { role: 'PRESS', name: 'one drum, off register' },
] as const

export const SupplementPlate = () => (
  <div className={css.gazette}>
    <header className={css.masthead}>
      <span className={css.mastheadName}>
        <Twice text='SUNDAY SUPPLEMENT' ink='pink' />
      </span>
      <span className={css.mastheadSub}>
        society pages — everything prints wrong eventually
      </span>
    </header>

    <div className={css.gazetteBody}>
      <figure className={css.calaveraBox}>
        <img
          src='/styles/posada-red.webp'
          alt='Posada calavera etching printed in red ink'
          loading='lazy'
          className={css.calavera}
        />
        <p className={css.vertHead} aria-hidden='true'>
          <Twice text='ALL PRINTS WRONG' ink='pink' />
        </p>
      </figure>

      <div className={css.suppCol}>
        <p className={css.columnText}>{GAZETTE.repeat(3)}</p>
        <aside className={css.reclame}>
          <p className={css.reclameHead}>
            <Twice text='REWARD: TWO INKS' ink='blue' />
          </p>
          <p className={css.reclameCopy}>
            for the whereabouts of the sheet that printed once. no questions.
            one apology.
          </p>
          <p className={css.reclameCoupon}>
            CLIP THIS ADVERT · REDEEM AT THE PRESS WINDOW · VOID WHERE LEGIBLE
          </p>
        </aside>
        <dl className={css.credits}>
          {CREDITS.map((row) => (
            <div key={row.role} className={css.creditRow}>
              <dt>{row.role}</dt>
              <dd>{row.name}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>

    <footer className={css.colophon}>
      <span className={css.rhinoStamp}>
        <img
          src='/styles/rhino-blue.webp'
          alt='Dürer rhinoceros woodcut in blue ink'
          loading='lazy'
          className={css.rhino}
        />
      </span>
      <span className={css.barcode} aria-hidden='true' />
      <p className={css.colophonLine}>
        printed twice without permission · inks 0078BF / FF48B0 · sospedra
        press, 2026
      </p>
    </footer>
  </div>
)
