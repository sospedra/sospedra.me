'use client'

import { useEffect, useRef, useState } from 'react'
import css from './clay.module.css'

const Eyes = ({ wide = false }: { wide?: boolean }) => (
  <span className={wide ? `${css.eyes} ${css.eyesWide}` : css.eyes}>
    <span className={css.eye}>
      <span data-pupil='true' className={css.pupil} />
    </span>
    <span className={css.eye}>
      <span data-pupil='true' className={css.pupil} />
    </span>
  </span>
)

const Cat = () => (
  <div className={css.cat}>
    <span className={`${css.catEar} ${css.catEarL}`} />
    <span className={`${css.catEar} ${css.catEarR}`} />
    <span className={css.catTail} />
    <div className={css.catBody}>
      <Eyes wide />
      <span className={css.catMouth} />
      <span className={css.catTongue} />
    </div>
  </div>
)

const SEGMENTS = [0, 1, 2, 3]

const Worm = () => (
  <div className={css.worm}>
    <div className={`${css.wormSeg} ${css.wormHead}`}>
      <Eyes />
      <span className={css.wormSmile} />
    </div>
    {SEGMENTS.map((i) => (
      <span
        key={i}
        className={css.wormSeg}
        style={{ animationDelay: `${i * 140}ms` }}
      />
    ))}
  </div>
)

const Mushroom = () => (
  <div className={css.mushroom}>
    <div className={css.mushCap}>
      <span className={css.mushSpot} />
      <span className={`${css.mushSpot} ${css.mushSpotB}`} />
    </div>
    <div className={css.mushStem}>
      <Eyes />
      <span className={css.mushMouth} />
    </div>
  </div>
)

const SPEC_KEYS = [
  'edition',
  'material',
  'height',
  'pressed',
  'status',
] as const

const CRITTERS = [
  {
    id: 'gato',
    name: 'GATO',
    role: 'security',
    price: '¥590 · CL-001',
    label: 'Gato, the black clay cat. Poke to squish.',
    art: <Cat />,
    spec: {
      edition: 'open',
      material: 'matte plasticine',
      height: '92 mm',
      pressed: 'MMXXVI',
      status: 'in stock',
    },
  },
  {
    id: 'noodle',
    name: 'NOODLE',
    role: 'morale',
    price: '¥390 · CL-002',
    label: 'Noodle, the mint clay worm. Poke to squish.',
    art: <Worm />,
    spec: {
      edition: 'first, of one',
      material: 'mint plasticine',
      height: '61 mm',
      pressed: 'MMXXVI',
      status: 'sold out',
    },
  },
  {
    id: 'shroom',
    name: 'SHROOM',
    role: 'shade',
    price: '¥490 · CL-003',
    label: 'Shroom, the lilac clay mushroom. Poke to squish.',
    art: <Mushroom />,
    spec: {
      edition: 'open',
      material: 'lilac over cream',
      height: '148 mm',
      pressed: 'MMXXVI',
      status: 'in stock',
    },
  },
]

// bumpy hand-pressed edges for the css critters, one displacement pass
const ClayRough = () => (
  <svg className='sr-only' aria-hidden='true' focusable='false'>
    <defs>
      <filter id='clay-rough' x='-4%' y='-4%' width='108%' height='108%'>
        <feTurbulence
          type='fractalNoise'
          baseFrequency='0.05'
          numOctaves='2'
          seed='3'
        />
        <feDisplacementMap
          in='SourceGraphic'
          scale='5'
          xChannelSelector='R'
          yChannelSelector='G'
        />
      </filter>
    </defs>
  </svg>
)

const useGooglyEyes = (stage: React.RefObject<HTMLDivElement | null>) => {
  useEffect(() => {
    const el = stage.current
    if (!el) return
    let raf = 0
    const aim = (event: PointerEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        for (const pupil of el.querySelectorAll<HTMLElement>('[data-pupil]')) {
          const socket = pupil.parentElement?.getBoundingClientRect()
          if (!socket) continue
          const dx = event.clientX - (socket.left + socket.width / 2)
          const dy = event.clientY - (socket.top + socket.height / 2)
          const len = Math.hypot(dx, dy) || 1
          const reach = Math.min(len, socket.width * 0.2)
          pupil.style.translate = `${((dx / len) * reach).toFixed(1)}px ${((dy / len) * reach).toFixed(1)}px`
        }
      })
    }
    window.addEventListener('pointermove', aim)
    return () => {
      window.removeEventListener('pointermove', aim)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [stage])
}

const ClayCritters = () => {
  const stage = useRef<HTMLDivElement>(null)
  const [pokes, setPokes] = useState<Record<string, number>>({})
  useGooglyEyes(stage)

  const poke = (id: string) =>
    setPokes((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))

  return (
    <div ref={stage} className={css.shelf}>
      <ClayRough />
      {CRITTERS.map((critter) => (
        <article key={critter.id} className={css.critterSlot}>
          <div className={css.cover}>
            <button
              type='button'
              aria-label={critter.label}
              className={css.critter}
              onClick={() => poke(critter.id)}
            >
              <span
                key={pokes[critter.id] ?? 0}
                className={pokes[critter.id] ? css.squish : undefined}
              >
                <span className={css.rough}>{critter.art}</span>
              </span>
              <span className={css.plinthShadow} aria-hidden='true' />
            </button>
          </div>
          <span className={css.critterName}>{critter.name}</span>
          <span className={css.critterRole}>dept. of {critter.role}</span>
          <span className={css.critterPrice}>{critter.price}</span>
          <dl className={css.spec}>
            {SPEC_KEYS.map((key) => (
              <div key={key} className={css.specRow}>
                <dt>{key}</dt>
                <dd>{critter.spec[key]}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  )
}

export default ClayCritters
