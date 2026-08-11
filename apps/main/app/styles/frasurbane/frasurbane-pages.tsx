import css from './frasurbane.module.css'
import {
  Astrolabe,
  Burst,
  MOTIFS,
  Orbit,
  Rosette,
  SPARKS,
  SwirlSun,
} from './frasurbane-art'

const Sparkles = ({ count }: { count: number }) => (
  <>
    {SPARKS.slice(0, count).map((spark) => (
      <span
        key={`${spark.x}-${spark.y}`}
        className={css.spark}
        style={{
          left: `${spark.x}%`,
          top: `${spark.y}%`,
          animationDelay: `${spark.d}ms`,
          fontSize: `${spark.s}em`,
        }}
        aria-hidden='true'
      >
        ✦
      </span>
    ))}
  </>
)

const COVER_LINES = [
  {
    title: 'Persevs and the head of Medvsa',
    note: 'the etiquette of monsters',
    plate: 'II',
  },
  {
    title: 'An index of props',
    note: 'six objects that furnished a decade',
    plate: 'III',
  },
  {
    title: 'The gorgon’s weather',
    note: 'El Greco forecasts the worst',
    plate: 'IV',
  },
  {
    title: 'Advertisement',
    note: 'a coffeehouse of the global village',
    plate: 'V',
  },
]

export const CoverPage = () => (
  <>
    <img
      src='/styles/perseus.jpg'
      alt='Antonio Canova, Perseus with the Head of Medusa, marble'
      className={css.coverStatue}
    />
    <span className={css.coverBurst} aria-hidden='true'>
      <Burst />
    </span>
    <span className={css.coverAstro} aria-hidden='true'>
      <Astrolabe />
    </span>
    <Sparkles count={9} />
    <header className={css.coverHead}>
      <p className={css.coverKicker}>
        VOL. IV · AVGVST MMXXVI · PRINTED NOWHERE
      </p>
      <h1 className={css.coverMast}>
        A FRASVRBANE
        <br />
        READER
      </h1>
      <p className={css.coverGothic}>the classical issue</p>
    </header>
    <ul className={css.coverLines}>
      {COVER_LINES.map((line) => (
        <li key={line.plate} className={css.coverLine}>
          <span className={css.coverLinePlate}>{line.plate}</span>
          <span className={css.coverLineTitle}>{line.title}</span>
          <span className={css.coverLineNote}>{line.note}</span>
        </li>
      ))}
    </ul>
    <div className={css.coverFoot}>
      <span className={css.barcode} aria-hidden='true' />
      <span className={css.coverPrice}>
        PRICE: ONE OPINION ✦ SEATTLE · MCMXCIV · FOREVER
      </span>
    </div>
    <span className={`${css.corner} ${css.cornerTl}`} aria-hidden='true'>
      <Rosette />
    </span>
    <span className={`${css.corner} ${css.cornerBr}`} aria-hidden='true'>
      <Rosette />
    </span>
  </>
)

export const FeaturePage = () => (
  <>
    <figure className={css.featPlate}>
      <img
        src='/styles/perseus.jpg'
        alt='Detail: the held head of Medusa'
        className={css.featStatue}
      />
      <figcaption className={css.featCut}>
        <b>Plate II</b> Canova, marble, 1804–6. The head, held like a lamp at a
        dinner party.
      </figcaption>
    </figure>
    <span className={css.featSpike} aria-hidden='true'>
      <Burst />
    </span>
    <header className={css.featHead}>
      <p className={css.featEyebrow}>THE FEATVRE · FROM OVR CLASSICS DESK</p>
      <h2 className={css.featTitle}>
        <em>Persevs,</em> politely
      </h2>
      <p className={css.featDek}>
        on carrying a catastrophe through a crowded room —{' '}
        <u>without turning the guests to stone</u>
      </p>
    </header>
    <div className={css.featBody}>
      <p>
        <span className={css.featDrop}>P</span>erseus came back over the sea
        with a thing in a satchel that could not be looked at. That is the whole
        story, told politely: a loan of winged sandals, a mirror used as a
        weapon, one careful swing. Everything after is packaging ❧ how to carry
        a catastrophe through a crowded room without turning the guests to
        stone.
      </p>
      <p>
        <span className={css.gothicWord}>Canova</span> carves the second after
        the sword. The hero is already composing himself for marble: weight
        settled on one hip, the terrible head held out at arm’s length. The
        violence is over and <u>the etiquette has begun</u>. It is the most
        frasurbane gesture in sculpture ❧ sophistication as a way of holding
        something monstrous, correctly.✝
      </p>
      <aside className={css.featBox}>
        <span className={css.featBoxHead}>THE CELLINI PROBLEM</span>
        <p>
          Cellini cast his Perseus in bronze in 1554 and put the head at waist
          height, low and defensive. Canova raised the arm and turned the wrist
          out: presentation, not defence. Two centuries apart, the same trophy,
          opposite manners.
        </p>
        <span className={css.featBoxCredit}>
          PHOTOGRAPH: MVSEO PIO-CLEMENTINO
        </span>
      </aside>
      <blockquote className={css.featPull}>
        <span className={css.gothicWord}>sophistication</span> is just a
        monster,<em> held correctly</em>
      </blockquote>
      <p>
        The reader of 1994 hangs this print above a leather armchair, between
        the espresso machine and the jazz shelf. The reader of 2024 scans it,
        crushes the blacks, letters it in fraktur and posts it at midnight.{' '}
        <u>Same statue. Same appetite.</u> Only the anxiety is new.
      </p>
      <p className={css.featFoot}>
        ✝ «frasurbane» — coined in the orbit of the Consumer Aesthetics Research
        Institute: Frasier + urbane, the upscale grammar of 1990s taste.
      </p>
    </div>
    <span className={css.featOrbit} aria-hidden='true'>
      <Orbit />
    </span>
    <aside className={css.featNote}>
      the sandals were a loan from Hermes; the mirror, from Athena. taste is
      mostly borrowed equipment.
    </aside>
    <Sparkles count={4} />
  </>
)

export const PropsPage = () => (
  <>
    <header className={css.propsHead}>
      <p className={css.propsKicker}>PLATE III · FVRNISHINGS OF A DECADE</p>
      <h2 className={css.propsTitle}>An index of props</h2>
    </header>
    <div className={css.propsWheel}>
      <span className={css.propsAstro}>
        <Astrolabe draw />
      </span>
      {MOTIFS.map((motif, index) => (
        <div key={motif.numeral} className={css.propsItem} data-slot={index}>
          <span className={css.propsIcon}>{motif.art}</span>
          <span className={css.propsNum}>{motif.numeral}</span>
          <span className={css.propsName}>{motif.name}</span>
          <span className={css.propsNote}>{motif.note}</span>
        </div>
      ))}
    </div>
    <p className={css.propsCaption}>
      fig. 1–6 ❧ everything above appeared within six feet of a saxophone
      between 1989 and 2004. <u>the astrolabe never once measured a star.</u>
    </p>
    <Sparkles count={5} />
  </>
)

const POEM = [
  'green thunder over the aqueduct.',
  'every window an averted eye.',
  'the town learned to look down first.',
]

export const DarkPage = () => (
  <>
    <p className={`${css.darkGothic} ${css.darkGothicLeft}`} aria-hidden='true'>
      greek mythology
    </p>
    <p
      className={`${css.darkGothic} ${css.darkGothicRight}`}
      aria-hidden='true'
    >
      petrification
    </p>
    <figure className={css.darkFrame}>
      <img
        src='/styles/toledo.jpg'
        alt='El Greco, View of Toledo'
        loading='lazy'
        className={css.darkPainting}
      />
    </figure>
    <h2 className={css.darkTitle}>
      <em>the gorgon’s</em> weather
    </h2>
    <div className={css.darkPoem}>
      {POEM.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <span className={css.darkPoemCredit}>
        after El Greco, c. 1599 · plate IV
      </span>
    </div>
    <div className={css.darkDots} aria-hidden='true'>
      <span className={css.dotFill} />
      <span className={css.dotFill} />
      <span className={css.dotFill} />
      <span className={css.dotFill} />
      <span />
    </div>
    <span className={`${css.corner} ${css.cornerTl}`} aria-hidden='true'>
      <Rosette />
    </span>
    <span className={`${css.corner} ${css.cornerBr}`} aria-hidden='true'>
      <Rosette />
    </span>
    <Sparkles count={12} />
  </>
)

const CREDITS = [
  { role: 'PVBLISHER', name: 'sospedra press' },
  { role: 'EDITOR', name: 'the resident of this website' },
  { role: 'PLATES', name: 'Canova · El Greco' },
  { role: 'TYPE', name: 'Bodoni, Cinzel, Garamond, Maguntia' },
  { role: 'PRESS', name: 'none. printed nowhere.' },
]

export const BackPage = () => (
  <>
    <aside className={css.advert}>
      <span className={css.advertLabel}>ADVERTISEMENT</span>
      <span className={css.advertSun} aria-hidden='true'>
        <SwirlSun />
      </span>
      <p className={css.advertName}>CAFÉ MERIDIEM</p>
      <p className={css.advertKind}>a global village coffeehouse</p>
      <p className={css.advertCopy}>
        espresso · conversation · unresolved longing
        <br />
        open until the jazz stops
      </p>
      <p className={css.advertCoupon}>
        mention this reader for a free refill ✦ est. MCMXCIV
      </p>
    </aside>
    <div className={css.backCol}>
      <h2 className={css.backTitle}>
        until the
        <br />
        next issue
      </h2>
      <dl className={css.credits}>
        {CREDITS.map((credit) => (
          <div key={credit.role} className={css.creditRow}>
            <dt>{credit.role}</dt>
            <dd>{credit.name}</dd>
          </div>
        ))}
      </dl>
      <p className={css.backCite}>
        Sospedra, Rubén. “Perseus, politely.” <em>A Frasurbane Reader</em>, vol.
        IV, August MMXXVI, plates I–V.
      </p>
      <p className={css.backTeaser}>
        NEXT ISSVE ❧ <u>the coffee issue</u> — steam, twine &amp; the whole
        global village
      </p>
      <div className={css.backFoot}>
        <span className={css.barcode} aria-hidden='true' />
        <span className={css.backStamp}>V / V · RETVRN TO ANY LAMPPOST</span>
      </div>
    </div>
    <Sparkles count={6} />
  </>
)
