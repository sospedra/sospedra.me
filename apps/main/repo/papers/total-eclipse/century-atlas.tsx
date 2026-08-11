'use client'

import cn from 'clsx'
import dynamic from 'next/dynamic'
import type React from 'react'
import css from './century-atlas.module.css'
import chrome from './figure.module.css'

/* 188 center lines and the world coastline are 134 KB of data. The article
   paints first, the atlas arrives after. */
const Figure = dynamic(() => import('./century-atlas-figure.tsx'), {
  ssr: false,
  loading: () => (
    <section className={cn(chrome.figure, chrome.bleed)}>
      <div className={chrome.card}>
        <div className={chrome.head}>
          <span className={chrome.label}>
            fig 01 · a century of shadows, 1900 to 2028
          </span>
        </div>
        <div className={chrome.body}>
          <div className={cn(chrome.skeleton, css.mapSkeleton)}>
            loading 188 shadows
          </div>
        </div>
      </div>
    </section>
  ),
})

const CenturyAtlas: React.FC = () => <Figure />

export default CenturyAtlas
