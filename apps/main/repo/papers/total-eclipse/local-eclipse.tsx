'use client'

import cn from 'clsx'
import dynamic from 'next/dynamic'
import type React from 'react'
import chrome from './figure.module.css'
import css from './local-eclipse.module.css'

/* The figure carries the shadow ephemeris, one country coastline and d3-geo.
   None of that belongs in the article's first paint. */
const Figure = dynamic(() => import('./local-eclipse-figure.tsx'), {
  ssr: false,
  loading: () => (
    <section className={cn(chrome.figure, chrome.bleed)}>
      <div className={chrome.card}>
        <div className={chrome.head}>
          <span className={chrome.label}>
            fig 04 · the shadow on the map, point by point
          </span>
        </div>
        <div className={chrome.body}>
          <div className={cn(chrome.skeleton, css.mapSkeleton)}>
            loading the shadow
          </div>
        </div>
      </div>
    </section>
  ),
})

const LocalEclipse: React.FC = () => <Figure />

export default LocalEclipse
