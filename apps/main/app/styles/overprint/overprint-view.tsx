'use client'

import Link from 'services/link'
import Shell from 'services/shell'
import { useSheetStack } from '../use-sheet-stack'
import SmearFilters from './ink-filters'
import css from './overprint.module.css'
import {
  InsectsPlate,
  MisprintPlate,
  SupplementPlate,
  Twice,
} from './overprint-pages'
import PressPlate from './overprint-press'

const SHEETS = [
  {
    id: 'front',
    numeral: '1',
    label: 'Front page',
    tone: 'paper',
    body: <PressPlate />,
  },
  {
    id: 'insects',
    numeral: '2',
    label: 'Archive insects',
    tone: 'pulp',
    body: <InsectsPlate />,
  },
  {
    id: 'misprint',
    numeral: '3',
    label: 'Anatomy of a misprint',
    tone: 'deep',
    body: <MisprintPlate />,
  },
  {
    id: 'supplement',
    numeral: '4',
    label: 'Sunday supplement',
    tone: 'paper',
    body: <SupplementPlate />,
  },
] as const

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const

type OverprintViewProps = { fontVars: string }

const OverprintView = ({ fontVars }: OverprintViewProps) => {
  const { refs, active, turnTo } = useSheetStack()

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <SmearFilters />
      <div className={css.backTag}>
        <Link url='/styles'>◀ STYLES</Link>
      </div>

      <nav className={css.rail} aria-label='Issue plates'>
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
            {index > 0 &&
              CORNERS.map((corner) => (
                <span
                  key={corner}
                  className={css.regCross}
                  data-corner={corner}
                  aria-hidden='true'
                >
                  <Twice text='✛' ink='pink' />
                </span>
              ))}
            <p className={css.sheetFolio}>
              <span>
                <Twice text='THE DUPLICATE · A TWO-INK WEEKLY' ink='pink' />
              </span>
              <span>
                <Twice text={`${sheet.numeral} / 4`} ink='pink' />
              </span>
            </p>
          </section>
        ))}
      </div>

      <div className={css.film} aria-hidden='true' />
    </Shell>
  )
}

export default OverprintView
