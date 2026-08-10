'use client'

import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { useSystem } from 'services/system'
import PixelGhost from './pixel-ghost'
import type { Origin } from './seance'
import css from './vapor-footer.module.css'

const Seance = dynamic(() => import('./seance'))

type SeanceState = 'unsummoned' | 'open' | 'closed'

export default function VaporFooter() {
  const [seance, setSeance] = useState<SeanceState>('unsummoned')
  const originRef = useRef<Origin | null>(null)
  const ghostRef = useRef<HTMLButtonElement>(null)
  const { discover } = useSystem()

  const summon = () => {
    if (seance !== 'unsummoned') return
    const rect = ghostRef.current?.getBoundingClientRect()
    if (rect) {
      originRef.current = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      }
    }
    discover('ghost')
    setSeance('open')
  }

  return (
    <>
      <div className={css.band}>
        <div aria-hidden='true' className={css.vapor}>
          <span className={css.vaporSun} />
          <span className={css.vaporGrid} />
          <svg
            aria-hidden='true'
            className={css.vaporScene}
            viewBox='0 0 1200 240'
            preserveAspectRatio='xMidYMax slice'
            xmlns='http://www.w3.org/2000/svg'
          >
            <g className={css.vaporStars}>
              <path d='M180 58 h8 M184 54 v8' />
              <path d='M470 66 h8 M474 62 v8' />
              <path d='M700 52 h8 M704 48 v8' />
              <path d='M980 72 h8 M984 68 v8' />
              <circle cx='120' cy='84' r='1.5' />
              <circle cx='520' cy='100' r='1.5' />
              <circle cx='820' cy='92' r='1.5' />
              <circle cx='1080' cy='58' r='1.5' />
            </g>
            <g className={css.vaporPlanet}>
              <ellipse
                cx='280'
                cy='94'
                rx='27'
                ry='7'
                transform='rotate(-18 280 94)'
              />
              <circle className={css.vaporPlanetBody} cx='280' cy='94' r='12' />
            </g>
            <g className={css.vaporComet}>
              <path d='M846 84 L906 66' />
              <path d='M906 66 h7 M909.5 62 v7' />
            </g>
            <g className={css.vaporPalms}>
              <path d='M60 240 C 66 196 70 144 74 96' />
              <path d='M74 96 C 54 82 34 82 20 96' />
              <path d='M74 96 C 50 92 30 100 18 118' />
              <path d='M74 96 C 52 100 38 116 32 138' />
              <path d='M74 96 C 94 82 114 82 128 94' />
              <path d='M74 96 C 98 92 118 100 130 116' />
              <path d='M74 96 C 96 100 110 116 116 136' />
              <circle cx='74' cy='96' r='3' />
              <path d='M1140 240 C 1134 196 1130 144 1126 96' />
              <path d='M1126 96 C 1146 82 1166 82 1180 96' />
              <path d='M1126 96 C 1150 92 1170 100 1182 118' />
              <path d='M1126 96 C 1148 100 1162 116 1168 138' />
              <path d='M1126 96 C 1106 82 1086 82 1072 94' />
              <path d='M1126 96 C 1102 92 1082 100 1070 116' />
              <path d='M1126 96 C 1104 100 1090 116 1084 136' />
              <circle cx='1126' cy='96' r='3' />
            </g>
          </svg>
        </div>
        <button
          aria-label='Wake the ghost'
          className={css.pixelGhost}
          data-lifted={seance !== 'unsummoned'}
          onClick={summon}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') summon()
          }}
          ref={ghostRef}
          type='button'
        >
          <PixelGhost />
          <span className={css.pixelGhostShadow} />
        </button>
      </div>
      {seance !== 'unsummoned' && (
        <Seance
          close={() => setSeance('closed')}
          open={seance === 'open'}
          origin={originRef.current}
        />
      )}
    </>
  )
}
