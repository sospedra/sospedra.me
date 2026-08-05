'use client'

import cn from 'clsx'
import { chunk } from 'es-toolkit'
import { useEffect, useState } from 'react'
import { type JukeRecord, RECORDS, selectorCode } from './records'
import css from './strip-menu.module.css'

const SLOTS = 6

const byCode = new Map<string, JukeRecord>(
  RECORDS.map((record, index) => [selectorCode(index), record]),
)
const LETTERS = [...new Set(RECORDS.map((_, index) => selectorCode(index)[0]))]
const PAGES = chunk(LETTERS, 2)

const MONTH_FORMAT = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
})

function formatLastSpin(iso: string): string {
  return MONTH_FORMAT.format(new Date(`${iso}T00:00:00`))
}

function linerText(record: JukeRecord): string {
  const segments = [`Pressed ${record.pressed}`]
  if (record.lastSpin) {
    segments.push(`Last spin ${formatLastSpin(record.lastSpin)}`)
  }
  segments.push(record.stack)
  return segments.join(' · ')
}

function pageLetters(page: number): string[] {
  const pair = PAGES[page] ?? ['A']
  if (pair.length === 2) return pair
  const [only] = pair
  return [only, String.fromCharCode(only.charCodeAt(0) + 1)]
}

type Slot = { code: string; record: JukeRecord | undefined }

function slotsForPage(page: number): Slot[] {
  return pageLetters(page).flatMap((letter) =>
    Array.from({ length: SLOTS }, (_, index) => {
      const code = `${letter}${index + 1}`
      return { code, record: byCode.get(code) }
    }),
  )
}

function EmptyStrip({ code }: { code: string }) {
  return (
    <span className={cn(css.strip, css.blank)}>
      <span className={css.crest}>{code}</span>
      <span className={css.body}>
        <span className={css.one}>· · · open slot · · ·</span>
      </span>
    </span>
  )
}

function TestPressingStrip({
  code,
  record,
}: {
  code: string
  record: JukeRecord
}) {
  return (
    <span className={cn(css.strip, css.blank)}>
      <span className={css.crest} aria-hidden>
        {code}
      </span>
      <span className={css.body}>
        <span className={css.name}>{record.title}</span>
        <span className={css.one}>{record.oneLiner}</span>
      </span>
      <span className={css.stamp}>test pressing</span>
    </span>
  )
}

function PressedStrip({
  code,
  record,
  onPick,
}: {
  code: string
  record: JukeRecord
  onPick: (record: JukeRecord) => void
}) {
  return (
    <a
      className={css.strip}
      href={record.url}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return
        }
        event.preventDefault()
        onPick(record)
      }}
    >
      <span className={css.crest} aria-hidden>
        {code}
      </span>
      <span className={css.body}>
        <span className={css.name}>{record.title}</span>
        <span className={css.one}>{record.oneLiner}</span>
        <span className={css.linerwrap}>
          <span className={css.liner}>{linerText(record)}</span>
        </span>
      </span>
    </a>
  )
}

function renderStrip(slot: Slot, onPick: (record: JukeRecord) => void) {
  if (!slot.record) return <EmptyStrip code={slot.code} />
  if (slot.record.status === 'test-pressing') {
    return <TestPressingStrip code={slot.code} record={slot.record} />
  }
  return <PressedStrip code={slot.code} record={slot.record} onPick={onPick} />
}

export default function StripMenu({
  armedLetter,
  onPick,
}: {
  armedLetter: string | null
  onPick: (record: JukeRecord) => void
}) {
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (!armedLetter) return
    const target = PAGES.findIndex((pair) => pair.includes(armedLetter))
    if (target > -1) setPage(target)
  }, [armedLetter])

  return (
    <section className={css.rack}>
      <div className={css.rackHead} aria-hidden>
        <span>SIDE A</span>
        <span className={css.sideB}>SIDE B</span>
      </div>
      <nav className={css.frame} aria-label='Projects'>
        <ul className={css.strips}>
          {slotsForPage(page).map((slot) => (
            <li
              key={slot.code}
              className={cn(css.slot, !slot.record && css.empty)}
              aria-hidden={slot.record ? undefined : true}
            >
              {renderStrip(slot, onPick)}
            </li>
          ))}
        </ul>
      </nav>
      <div className={css.tabs} role='tablist' hidden={PAGES.length < 2}>
        {PAGES.map((pair, index) => (
          <button
            key={pair.join('')}
            type='button'
            role='tab'
            className={css.tab}
            aria-selected={index === page}
            onClick={() => setPage(index)}
          >
            {pair.join('–')}
          </button>
        ))}
      </div>
    </section>
  )
}
