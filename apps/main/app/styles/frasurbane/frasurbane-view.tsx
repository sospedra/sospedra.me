'use client'

import Link from 'services/link'
import Shell from 'services/shell'
import { useSheetStack } from '../use-sheet-stack'
import css from './frasurbane.module.css'
import {
  BackPage,
  CoverPage,
  DarkPage,
  FeaturePage,
  PropsPage,
} from './frasurbane-pages'

const SHEETS = [
  {
    id: 'cover',
    numeral: 'I',
    label: 'Cover',
    tone: 'paper',
    body: <CoverPage />,
  },
  {
    id: 'feature',
    numeral: 'II',
    label: 'Perseus, politely',
    tone: 'paper',
    body: <FeaturePage />,
  },
  {
    id: 'props',
    numeral: 'III',
    label: 'An index of props',
    tone: 'espresso',
    body: <PropsPage />,
  },
  {
    id: 'weather',
    numeral: 'IV',
    label: 'The gorgon’s weather',
    tone: 'night',
    body: <DarkPage />,
  },
  {
    id: 'back',
    numeral: 'V',
    label: 'Back cover',
    tone: 'merlot',
    body: <BackPage />,
  },
] as const

type FrasurbaneViewProps = { fontVars: string }

const FrasurbaneView = ({ fontVars }: FrasurbaneViewProps) => {
  const { refs, active, turnTo } = useSheetStack()

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <div className={css.backTag}>
        <Link url='/styles'>◀ styles</Link>
      </div>

      <nav className={css.rail} aria-label='Issue pages'>
        {SHEETS.map((sheet, index) => (
          <button
            key={sheet.id}
            type='button'
            className={css.railDot}
            data-on={active === index ? 'true' : undefined}
            aria-label={`Turn to plate ${sheet.numeral}: ${sheet.label}`}
            onClick={() => turnTo(index)}
          >
            {sheet.numeral}
          </button>
        ))}
      </nav>

      <div className={css.issue}>
        {SHEETS.map((sheet, index) => (
          <section
            key={sheet.id}
            ref={(node) => {
              refs.current[index] = node
            }}
            data-sheet={index}
            data-tone={sheet.tone}
            className={css.sheet}
            aria-label={`Plate ${sheet.numeral} — ${sheet.label}`}
          >
            <div className={css.sheetInner}>{sheet.body}</div>
            <span className={css.sheetEdge} aria-hidden='true' />
            <p className={css.sheetFolio}>
              <span>A FRASVRBANE READER</span>
              <span>
                {sheet.numeral} / {SHEETS.at(-1)?.numeral}
              </span>
            </p>
          </section>
        ))}
      </div>

      <div className={css.film} aria-hidden='true' />
    </Shell>
  )
}

export default FrasurbaneView
