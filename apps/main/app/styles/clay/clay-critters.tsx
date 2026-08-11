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

const CRITTERS = [
  { id: 'gato', label: 'Black clay cat. Poke to squish.', art: <Cat /> },
  { id: 'gusano', label: 'Mint clay worm. Poke to squish.', art: <Worm /> },
  {
    id: 'seta',
    label: 'Lilac clay mushroom. Poke to squish.',
    art: <Mushroom />,
  },
]

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
      {CRITTERS.map((critter) => (
        <button
          key={critter.id}
          type='button'
          aria-label={critter.label}
          className={css.critter}
          onClick={() => poke(critter.id)}
        >
          <span
            key={pokes[critter.id] ?? 0}
            className={pokes[critter.id] ? css.squish : undefined}
          >
            {critter.art}
          </span>
          <span className={css.plinthShadow} aria-hidden='true' />
        </button>
      ))}
    </div>
  )
}

export default ClayCritters
