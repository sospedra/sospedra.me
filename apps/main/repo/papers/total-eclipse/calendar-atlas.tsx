'use client'

import cn from 'clsx'
import dynamic from 'next/dynamic'
import type React from 'react'
import css from './century-atlas.module.css'
import chrome from './figure.module.css'

const Figure = dynamic(() => import('./calendar-atlas-figure.tsx'), {
  ssr: false,
  loading: () => (
    <section className={cn(chrome.figure, chrome.bleed)}>
      <div className={chrome.card}>
        <div className={chrome.head}>
          <span className={chrome.label}>fig 03 · the saros calendar</span>
        </div>
        <div className={chrome.body}>
          <div className={cn(chrome.skeleton, css.mapSkeleton)}>
            loading 31 series
          </div>
        </div>
      </div>
    </section>
  ),
})

const CalendarAtlas: React.FC = () => <Figure />

export default CalendarAtlas
