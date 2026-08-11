'use client'

import { useRef, useState } from 'react'
import css from './clay.module.css'
import ClayCritters from './clay-critters'
import ClayPad from './clay-pad'
import ClaySpecimen from './clay-specimen'

const Star = () => (
  <svg viewBox='0 0 96 96' className={css.prizeArt} aria-hidden='true'>
    <path
      d='M48 8l11 26 28 3-21 19 6 28-24-15-24 15 6-28L9 37l28-3z'
      fill='#f5d789'
      stroke='#c4a45a'
      strokeWidth='6'
      strokeLinejoin='round'
    />
  </svg>
)

const PRIZES = [
  { id: 'star', label: 'a butter star', art: <Star /> },
  {
    id: 'heart',
    label: 'a salmon heart',
    art: <span className={css.prizeHeart} />,
  },
  {
    id: 'ghost',
    label: 'a cream ghost',
    art: <span className={css.prizeGhost} />,
  },
  { id: 'ball', label: 'a blue ball', art: <span className={css.prizeBall} /> },
]

const ODDS = [
  ['butter star', '1/4'],
  ['salmon heart', '1/4'],
  ['cream ghost', '1/4'],
  ['blue ball', '1/4'],
]

type BoxPhase = 'idle' | 'shaking' | 'open'

const BlindBox = () => {
  const [phase, setPhase] = useState<BoxPhase>('idle')
  const [prize, setPrize] = useState(0)
  const rolls = useRef(0)

  const open = () => {
    if (phase === 'shaking') return
    setPhase('shaking')
    rolls.current += 1
    window.setTimeout(() => {
      setPrize(Math.floor(Math.random() * PRIZES.length))
      setPhase('open')
    }, 750)
  }

  return (
    <div className={css.boxScene}>
      {phase === 'open' && (
        <div
          key={rolls.current}
          className={css.prize}
          role='img'
          aria-label={PRIZES[prize].label}
        >
          {PRIZES[prize].art}
        </div>
      )}
      <button
        type='button'
        className={css.box}
        data-phase={phase}
        onClick={open}
        aria-label='Blind box. Press to shake one open.'
      >
        <span className={css.boxLid} />
        <span className={css.boxMark}>?</span>
      </button>
      <p className={css.boxNote}>
        {phase === 'open'
          ? `you pulled ${PRIZES[prize].label}`
          : 'press the box. no refunds, no duplicates, no promises.'}
      </p>
    </div>
  )
}

const OddsCard = () => (
  <ul className={css.odds}>
    <li className={css.oddsHead}>pull odds, notarized</li>
    {ODDS.map(([name, rate]) => (
      <li key={name} className={css.oddsRow}>
        <span>{name}</span>
        <span>{rate}</span>
      </li>
    ))}
    <li className={`${css.oddsRow} ${css.oddsSecret}`}>
      <span>secret ???</span>
      <span>1/144 — never witnessed</span>
    </li>
  </ul>
)

const COVER_LINES = [
  { plate: '02', title: 'the specimen', note: 'one blob, live and unshipped' },
  { plate: '03', title: 'the catalog', note: 'five shapes, zero lore' },
  { plate: '04', title: 'the workshop', note: 'roll, poke, smash, repeat' },
]

export const CoverPage = () => (
  <>
    <img
      src='/styles/clay-hero.jpg'
      alt='Three plasticine mascots on a salmon studio floor: a mint cat, a lilac ghost blob and a butter creature hugging a star'
      className={css.coverHero}
    />
    <div className={css.coverScrim} aria-hidden='true' />
    <header className={css.coverHead}>
      <p className={css.coverKicker}>soft goods quarterly · est. by thumb</p>
      <h1 className={css.coverMast}>
        THE
        <br />
        PLASTICINE
        <br />
        REVIEW
      </h1>
      <p className={css.coverDek}>
        a mail-order catalog for thumbs. every item unbaked. every eye googly.
      </p>
    </header>
    <span className={`${css.sticker} ${css.stickerSeries}`}>SERIES 01</span>
    <span className={`${css.sticker} ${css.stickerPrice}`}>¥590</span>
    <span className={`${css.sticker} ${css.stickerBake}`}>DO NOT BAKE</span>
    <span className={css.coverIssueChip}>ISSUE Nº 01 · AUG 2026</span>
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
      <span className={css.coverFootNote}>
        PRESSED IN MMXXVI · NO REFUNDS BACK INTO THE BALL
      </span>
    </div>
  </>
)

const SPECIMEN_SPEC = [
  ['edition', 'one of one, unboxed'],
  ['material', 'mint plasticine, unbaked'],
  ['height', '15 360 vertices'],
  ['pressed', 'MMXXVI, by thumb'],
  ['status', 'alive, breathing'],
]

export const SpecimenPage = ({ active }: { active: boolean }) => (
  <div className={css.specimenGrid}>
    <span className={css.ghostNumeral} aria-hidden='true'>
      02
    </span>
    <header className={css.plateHead}>
      <p className={css.plateKicker}>plate two · live stock</p>
      <h2 className={css.plateTitle}>THE SPECIMEN</h2>
    </header>
    <div className={css.specimenWell}>
      <ClaySpecimen active={active} />
      <span className={`${css.sticker} ${css.stickerOnCanvas}`}>
        DO NOT BAKE
      </span>
      <p className={css.specimenCaption}>
        fig. 04 — the specimen at rest, displaced along its own normals, three
        octaves deep. poke it. it forgives in 1.2 seconds.
      </p>
    </div>
    <aside className={css.specimenRail}>
      <dl className={css.spec}>
        {SPECIMEN_SPEC.map(([key, value]) => (
          <div key={key} className={css.specRow}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <span className={css.priceChip}>CL-000 · NOT FOR SALE</span>
      <p className={css.specimenNote}>
        it idles at one slow rotation per half minute and answers pressure with
        a spring. the eyes are aftermarket. they follow you, not the blob.
      </p>
      <span className={css.barcode} aria-hidden='true' />
    </aside>
  </div>
)

const PRICE_CHIPS = ['GATO ¥590', 'NOODLE ¥390', 'SHROOM ¥490', 'SECRET ¥???']

export const CatalogPage = () => (
  <div className={css.catalogGrid}>
    <header className={css.plateHead}>
      <p className={css.plateKicker}>plate three · mail order</p>
      <h2 className={css.plateTitle}>THE CATALOG</h2>
    </header>
    <div className={css.catalogChips}>
      {PRICE_CHIPS.map((chip) => (
        <span key={chip} className={css.priceChip}>
          {chip}
        </span>
      ))}
    </div>
    <div className={css.catalogPlates}>
      <figure className={css.crewFig}>
        <img
          src='/styles/clay-crew.jpg'
          alt='Five clay shape characters in a lineup: pentagon, square, pebble, ball and diamond, with tiny clay props floating above'
          loading='lazy'
          className={css.plateImg}
        />
        <figcaption className={css.plateCap}>
          fig. 02 — season one cast. five shapes, zero lore.
        </figcaption>
      </figure>
      <figure className={css.iconsFig}>
        <img
          src='/styles/clay-icons.jpg'
          alt='A grid of nine clay icons on cream tiles over lavender: star, heart, bolt, flower, arrow, padlock, sun, ghost and check mark'
          loading='lazy'
          className={css.plateImg}
        />
        <figcaption className={css.plateCap}>
          fig. 03 — the icon tray. sold separately.
        </figcaption>
      </figure>
    </div>
    <aside className={css.catalogRail}>
      <BlindBox />
      <OddsCard />
      <div className={css.coupon}>
        <span className={css.couponLabel}>mail-order form</span>
        <p className={css.couponRow}>
          [ ] gato · [ ] noodle · [ ] shroom · [x] surprise me
        </p>
        <p className={css.couponFine}>
          allow 6 to 8 weeks. clay may arrive pre-squished. no refunds back into
          the original ball.
        </p>
        <span className={css.barcode} aria-hidden='true' />
      </div>
    </aside>
  </div>
)

const STEPS = [
  'wash your thumbs. the clay remembers.',
  'drag the pad. every stroke rolls a fresh rope.',
  'poke a resident. they forgive fast.',
  'smash it flat. begin again.',
]

export const WorkshopPage = () => (
  <div className={css.workshopGrid}>
    <header className={css.plateHead}>
      <p className={css.plateKicker}>plate four · centerfold</p>
      <h2 className={css.plateTitle}>THE WORKSHOP</h2>
    </header>
    <ol className={css.workshopSteps}>
      {STEPS.map((step, index) => (
        <li key={step}>
          <span className={css.stepIndex}>{index + 1}.</span> {step}
        </li>
      ))}
    </ol>
    <div className={css.workshopPad}>
      <ClayPad />
    </div>
    <aside className={css.ad}>
      <span className={css.adLabel}>advertisement</span>
      <div className={css.chipRow}>
        <button type='button' className={css.chip}>
          press me
        </button>
        <button type='button' className={`${css.chip} ${css.chipMint}`}>
          no, me
        </button>
        <button type='button' className={`${css.chip} ${css.chipLilac}`}>
          gently
        </button>
      </div>
      <p className={css.adCopy}>
        squish buttons™ — the only buttons that apologize when pressed.
      </p>
    </aside>
    <div className={css.workshopPets}>
      <ClayCritters />
    </div>
    <footer className={css.colophon}>
      printed in soft focus · fingerprints are a feature, not a defect ·
      sospedra press
    </footer>
  </div>
)
