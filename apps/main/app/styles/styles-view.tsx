'use client'

import type { Route } from 'next'
import type { CSSProperties, ReactNode } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import css from './styles.module.css'

const StickersCover = () => (
  <span className={css.art}>
    <span className={css.stickerMast}>STICKERS</span>
    <span className={css.stickerStrip}>FREE · TAKE ONE</span>
  </span>
)

const OverprintCover = () => (
  <span className={css.art}>
    <span className={css.press}>
      <span className={`${css.plate} ${css.plateBlue}`}>OVERPRINT</span>
      <span className={`${css.plate} ${css.platePink}`}>OVERPRINT</span>
    </span>
    <span className={css.regMark} aria-hidden='true' />
  </span>
)

const FrasurbaneCover = () => (
  <span className={css.art}>
    <span className={css.frasRule} />
    <span className={css.frasMast}>Frasurbane</span>
    <span className={css.frasTag}>
      <span className={css.frasSpark}>✦</span>
      <em>free</em>
      <span className={css.frasSpark}>✦</span>
    </span>
    <span className={css.frasRule} />
  </span>
)

const ClayCover = () => (
  <span className={css.art}>
    <span className={css.clayMast}>CLAY</span>
    <span className={css.clayPrice}>0€</span>
  </span>
)

const MishkoCover = () => (
  <span className={css.art}>
    <span className={css.melt}>
      <span className={css.meltMast}>MISHKO</span>
      <span className={`${css.meltMast} ${css.meltGhost}`} aria-hidden='true'>
        MISHKO
      </span>
    </span>
  </span>
)

const NeoCover = () => (
  <span className={css.art}>
    <span className={css.neoMast}>
      NEU
      <br />
      BRUTAL
    </span>
  </span>
)

type Card = {
  id: string
  index: string
  href: Route
  name: string
  blurb: string
  art: ReactNode
}

const CARDS: Card[] = [
  {
    id: 'stickers',
    index: '01',
    href: '/styles/stickers',
    name: 'stickers',
    blurb: 'die-cut chaos on kraft — drag, peel, slap',
    art: <StickersCover />,
  },
  {
    id: 'overprint',
    index: '02',
    href: '/styles/overprint',
    name: 'overprint',
    blurb: 'two riso inks lose their registration',
    art: <OverprintCover />,
  },
  {
    id: 'frasurbane',
    index: '03',
    href: '/styles/frasurbane',
    name: 'frasurbane',
    blurb: 'one spread, 1994 warmth vs 2024 doom',
    art: <FrasurbaneCover />,
  },
  {
    id: 'clay',
    index: '04',
    href: '/styles/clay',
    name: 'clay',
    blurb: 'plasticine critters with googly eyes',
    art: <ClayCover />,
  },
  {
    id: 'mishko',
    index: '05',
    href: '/styles/mishko',
    name: 'mishko effect',
    blurb: 'thermal type melting under your pointer',
    art: <MishkoCover />,
  },
  {
    id: 'neubrutalism',
    index: '06',
    href: '/styles/neubrutalism',
    name: 'neubrutalism',
    blurb: 'hard shadows, candy panels, toy controls',
    art: <NeoCover />,
  },
]

const SHELVES = [
  { id: 'upper', cards: CARDS.slice(0, 3) },
  { id: 'lower', cards: CARDS.slice(3) },
]

const Cover = ({ card }: { card: Card }) => (
  <span
    className={css.slot}
    style={{ '--i': Number(card.index) - 1 } as CSSProperties}
  >
    <Link url={card.href} className={css.cover} data-style={card.id}>
      <span className={css.spine}>
        <span>{card.name}</span>
        <span className={css.spineNo}>Nº {card.index}</span>
      </span>
      <span className={css.face}>
        <span className={css.chipRow}>
          <span className={css.chip}>Nº {card.index}</span>
          <span className={css.micro}>AUG 2026</span>
        </span>
        {card.art}
        <span className={css.coverLine}>{card.blurb}</span>
        <span className={css.tray}>
          <span className={css.barcode} aria-hidden='true' />
          <span className={css.micro}>0.00</span>
        </span>
      </span>
    </Link>
    <span className={css.slotRail} aria-hidden='true' />
  </span>
)

type StylesViewProps = { fontVars: string }

const StylesView = ({ fontVars }: StylesViewProps) => (
  <Shell className={`${css.page} ${fontVars}`}>
    <div className={css.folio}>
      <span>SOSPEDRA PRESS</span>
      <span className={css.folioIssue}>ISSUE Nº 01 · PRICE: NOTHING</span>
      <span className={css.folioRight}>
        <span className={css.openSign}>OPEN</span>
        <span>AUG 2026</span>
      </span>
    </div>
    <header className={css.head}>
      <p className={css.eyebrow}>six aesthetics, stolen for an afternoon</p>
      <h1 className={css.title}>STYLE LAB</h1>
      <p className={css.note}>
        each door is a different world. every card speaks its own accent.
      </p>
    </header>

    <nav className={css.rack} aria-label='Style demos'>
      {SHELVES.map((shelf) => (
        <div key={shelf.id} className={css.shelf}>
          {shelf.cards.map((card) => (
            <Cover key={card.id} card={card} />
          ))}
        </div>
      ))}
    </nav>

    <section className={css.contents} aria-hidden='true'>
      <p className={css.contentsHead}>in this issue · stock list</p>
      {CARDS.map((card) => (
        <p key={card.id} className={css.contentsRow}>
          <span className={css.contentsIndex}>{card.index}</span>
          <span className={css.contentsName}>{card.name}</span>
          <span className={css.contentsLeader} />
          <span className={css.contentsPage}>p. {card.index}</span>
        </p>
      ))}
    </section>

    <footer className={css.foot}>
      <Link url='/' className={css.homeLink}>
        ○ home
      </Link>
    </footer>
  </Shell>
)

export default StylesView
