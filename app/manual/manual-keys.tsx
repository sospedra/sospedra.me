'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { scrollMarkedScene, useHotkeys } from 'service/hotkeys'
import css from './manual.module.css'

const PAGE_SELECTOR = '[data-manual-page]'
const FIRST_COMMISSIONING_CHECK = 'manual-check-assumptions'
const SECTIONS = [
  ['00', 'Cover'],
  ['01', 'Setup'],
  ['02', 'Parts'],
  ['03', 'Principles'],
  ['04', 'Traits'],
  ['05', 'Service'],
] as const

function BlueprintExitNotes() {
  return (
    <svg
      className={css.blueprintExitNotes}
      viewBox='0 0 240 78'
      aria-hidden='true'
      focusable='false'
    >
      <g className={css.blueprintIconNote}>
        <rect x='16' y='23' width='42' height='27' rx='2' />
        <circle cx='37' cy='36' r='2.5' />
        <path d='M37 36 10 20V14h24' />
        <text x='38' y='16'>
          EXIT-01
        </text>
      </g>
      <g className={css.blueprintRouteNote}>
        <circle cx='86' cy='20' r='2.5' />
        <path d='m86 20 19-10h70' />
        <text x='110' y='9'>
          RETURN PATH
        </text>
      </g>
      <g className={css.blueprintTargetNote}>
        <path d='M99 14v44m-5-44h10m-10 44h10' />
        <text x='109' y='38'>
          MIN H / 44 PX
        </text>
      </g>
      <g className={css.blueprintDestinationNote}>
        <circle cx='75' cy='58' r='2.5' />
        <path d='M75 58c3 9 18 12 34 12h57' />
        <text x='172' y='73'>
          DEST / HOME
        </text>
      </g>
    </svg>
  )
}

// `[` / `]` flip between the manual's authored sheets
export default function ManualKeys() {
  useEffect(() => {
    const input = document.getElementById(FIRST_COMMISSIONING_CHECK)
    if (!(input instanceof HTMLInputElement)) return

    const target = input.closest('li') ?? input
    let hasInteracted = false
    let markTimer: number | undefined

    const noteInteraction = () => {
      hasInteracted = true
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        markTimer = window.setTimeout(() => {
          if (!hasInteracted) input.checked = true
        }, 500)
      },
      { threshold: 0 },
    )

    input.addEventListener('change', noteInteraction)
    observer.observe(target)

    return () => {
      observer.disconnect()
      input.removeEventListener('change', noteInteraction)
      if (markTimer !== undefined) window.clearTimeout(markTimer)
    }
  }, [])

  useHotkeys([
    [
      '[',
      (event) => {
        if (scrollMarkedScene(PAGE_SELECTOR, -1)) event.preventDefault()
      },
    ],
    [
      ']',
      (event) => {
        if (scrollMarkedScene(PAGE_SELECTOR, 1)) event.preventDefault()
      },
    ],
  ])

  const openSection = (index: number) => {
    const page = document.querySelectorAll<HTMLElement>(PAGE_SELECTOR)[index]
    if (!page) return
    page.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    })
  }

  return (
    <nav className={css.sectionIndex} aria-label='Manual section index'>
      <div className={css.indexLegend}>
        <strong>Document index</strong>
        <span>Select section / [ ] flip sheets</span>
      </div>
      <ol>
        {SECTIONS.map(([number, label], index) => (
          <li key={number}>
            <button
              type='button'
              onClick={() => openSection(index)}
              aria-label={`Open manual page ${number}, ${label}`}
            >
              <b>{number}</b>
              <span>{label}</span>
            </button>
          </li>
        ))}
        <li className={css.indexHome}>
          <Link href='/' className={css.blueprintExit}>
            <b>Exit</b>
            <span>Go back home</span>
            <BlueprintExitNotes />
          </Link>
        </li>
      </ol>
    </nav>
  )
}
