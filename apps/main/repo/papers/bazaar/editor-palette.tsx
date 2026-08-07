'use client'

import type React from 'react'
import { useState } from 'react'
import css from './editor-palette.module.css'

type Tab = 'props' | 'arch' | 'light'

const TABS: Array<{ id: Tab; src: string; alt: string }> = [
  {
    id: 'props',
    src: '/papers/bazaar/editor-props.webp',
    alt: 'the props palette: keyed sprites in a filterable grid, ac-cluster to candle-pole',
  },
  {
    id: 'arch',
    src: '/papers/bazaar/editor-arch.webp',
    alt: 'the architecture palette: beam families, catwalks and the stairs sprite',
  },
  {
    id: 'light',
    src: '/papers/bazaar/editor-light.webp',
    alt: 'the light palette: seven glow colors plus black, drop point picks the anchor',
  },
]

const EditorPalette: React.FC<{ label: string }> = (props) => {
  const [tab, setTab] = useState<Tab>('props')

  return (
    <section aria-label={props.label} className={css.palette}>
      <div className={css.head}>
        <span className={css.label}>{props.label}</span>
        <span className={css.toggle}>
          {TABS.map((entry) => (
            <button
              aria-pressed={tab === entry.id}
              className={css.mode}
              key={entry.id}
              onClick={() => setTab(entry.id)}
              type='button'
            >
              {entry.id}
            </button>
          ))}
        </span>
      </div>
      <div className={css.stage}>
        {TABS.map((entry) => (
          <img
            alt={entry.alt}
            className={css.shot}
            data-active={tab === entry.id ? 'true' : 'false'}
            height={782}
            key={entry.id}
            loading='lazy'
            src={entry.src}
            width={648}
          />
        ))}
      </div>
    </section>
  )
}

export default EditorPalette
