'use client'

import type { Route } from 'next'
import type { ReactNode } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import css from './styles.module.css'

const StickersPreview = () => (
  <span className={css.pvSticker}>
    <span className={css.pvStickerPlate}>STICKERS</span>
  </span>
)

const OverprintPreview = () => (
  <span className={css.pvPress}>
    <span className={`${css.pvPlate} ${css.pvPlateBlue}`}>OVERPRINT</span>
    <span className={`${css.pvPlate} ${css.pvPlatePink}`}>OVERPRINT</span>
  </span>
)

const FrasurbanePreview = () => (
  <span className={css.pvSerif}>
    <em>Frasurbane</em>
    <span className={css.pvSpark}>✦</span>
  </span>
)

const ClayPreview = () => (
  <span className={css.pvClay}>
    <span className={css.pvBlob}>
      <span className={css.pvEye} />
      <span className={css.pvEye} />
    </span>
    <span className={css.pvClayWord}>Clay</span>
  </span>
)

const MishkoPreview = () => (
  <span className={css.pvMelt}>
    <span className={css.pvMeltWord}>MELT</span>
    <span className={css.pvMeltDrip} aria-hidden='true'>
      MELT
    </span>
  </span>
)

const NeubrutalismPreview = () => <span className={css.pvNeo}>NEO!</span>

type Card = {
  id: string
  index: string
  href: Route
  name: string
  blurb: string
  preview: ReactNode
}

const CARDS: Card[] = [
  {
    id: 'stickers',
    index: '01',
    href: '/styles/stickers',
    name: 'stickers',
    blurb: 'die-cut chaos on kraft — drag, peel, slap',
    preview: <StickersPreview />,
  },
  {
    id: 'overprint',
    index: '02',
    href: '/styles/overprint',
    name: 'overprint',
    blurb: 'two riso inks lose their registration',
    preview: <OverprintPreview />,
  },
  {
    id: 'frasurbane',
    index: '03',
    href: '/styles/frasurbane',
    name: 'frasurbane',
    blurb: 'one spread, 1994 warmth vs 2024 doom',
    preview: <FrasurbanePreview />,
  },
  {
    id: 'clay',
    index: '04',
    href: '/styles/clay',
    name: 'clay',
    blurb: 'plasticine critters with googly eyes',
    preview: <ClayPreview />,
  },
  {
    id: 'mishko',
    index: '05',
    href: '/styles/mishko',
    name: 'mishko effect',
    blurb: 'thermal type melting under your pointer',
    preview: <MishkoPreview />,
  },
  {
    id: 'neubrutalism',
    index: '06',
    href: '/styles/neubrutalism',
    name: 'neubrutalism',
    blurb: 'hard shadows, candy panels, toy controls',
    preview: <NeubrutalismPreview />,
  },
]

type StylesViewProps = { fontVars: string }

const StylesView = ({ fontVars }: StylesViewProps) => (
  <Shell className={`${css.page} ${fontVars}`}>
    <header className={css.head}>
      <p className={css.eyebrow}>six aesthetics, stolen for an afternoon</p>
      <h1 className={css.title}>STYLE LAB</h1>
      <p className={css.note}>
        each door is a different world. every card speaks its own accent.
      </p>
    </header>

    <nav className={css.grid} aria-label='Style demos'>
      {CARDS.map((card) => (
        <Link
          key={card.id}
          url={card.href}
          className={css.card}
          data-style={card.id}
        >
          <span className={css.cardIndex}>{card.index}</span>
          <span className={css.cardPreview}>{card.preview}</span>
          <span className={css.cardMeta}>
            <span className={css.cardName}>{card.name}</span>
            <span className={css.cardBlurb}>{card.blurb}</span>
          </span>
          <span className={css.cardArrow} aria-hidden='true'>
            →
          </span>
        </Link>
      ))}
    </nav>

    <footer className={css.foot}>
      <Link url='/' className={css.homeLink}>
        ○ home
      </Link>
    </footer>
  </Shell>
)

export default StylesView
