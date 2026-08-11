'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
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

const useSheetStack = () => {
  const refs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-active', 'true')
          setActive(Number((entry.target as HTMLElement).dataset.sheet))
        }
      },
      { threshold: 0.45 },
    )
    for (const sheet of refs.current) {
      if (sheet) observer.observe(sheet)
    }
    return () => observer.disconnect()
  }, [])

  return { refs, active }
}

type FrasurbaneViewProps = { fontVars: string }

const FrasurbaneView = ({ fontVars }: FrasurbaneViewProps) => {
  const { refs, active } = useSheetStack()

  const turnTo = (index: number) =>
    refs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
