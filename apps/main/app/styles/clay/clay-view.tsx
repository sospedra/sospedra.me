'use client'

import Link from 'services/link'
import Shell from 'services/shell'
import { useSheetStack } from '../use-sheet-stack'
import css from './clay.module.css'
import {
  CatalogPage,
  CoverPage,
  SpecimenPage,
  WorkshopPage,
} from './clay-pages'

const PLATES = [
  { id: 'cover', label: 'Cover', tone: 'salmon' },
  { id: 'specimen', label: 'The specimen', tone: 'studio' },
  { id: 'catalog', label: 'The catalog', tone: 'lilac' },
  { id: 'workshop', label: 'The workshop', tone: 'butter' },
] as const

type ClayViewProps = { fontVars: string }

const ClayView = ({ fontVars }: ClayViewProps) => {
  const { refs, active, turnTo } = useSheetStack()

  const bodies = [
    <CoverPage key='cover' />,
    <SpecimenPage key='specimen' active={active === 1} />,
    <CatalogPage key='catalog' />,
    <WorkshopPage key='workshop' />,
  ]

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <div className={css.backTag}>
        <Link url='/styles'>◀ styles</Link>
      </div>

      <nav className={css.rail} aria-label='Issue plates'>
        {PLATES.map((plate, index) => (
          <button
            key={plate.id}
            type='button'
            className={css.railDot}
            data-on={active === index ? 'true' : undefined}
            aria-label={`Turn to plate ${index + 1}: ${plate.label}`}
            onClick={() => turnTo(index)}
          >
            {index + 1}
          </button>
        ))}
      </nav>

      <div className={css.issue}>
        {PLATES.map((plate, index) => (
          <section
            key={plate.id}
            ref={(node) => {
              refs.current[index] = node
            }}
            data-sheet={index}
            data-tone={plate.tone}
            className={css.sheet}
            aria-label={`Plate ${index + 1} — ${plate.label}`}
          >
            <div className={css.sheetInner}>{bodies[index]}</div>
            <span className={`${css.dent} ${css.dentTl}`} aria-hidden='true' />
            <span className={`${css.dent} ${css.dentTr}`} aria-hidden='true' />
            <span className={`${css.dent} ${css.dentBl}`} aria-hidden='true' />
            <p className={css.sheetFolio}>
              <span>THE PLASTICINE REVIEW</span>
              <span>
                {index + 1} / {PLATES.length}
              </span>
            </p>
          </section>
        ))}
      </div>
    </Shell>
  )
}

export default ClayView
