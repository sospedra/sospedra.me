import cn from 'clsx'
import { range } from 'es-toolkit'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { createRange, createRng } from 'services/random'
import { sceneFor } from './altitude'
import { useRouteTransition } from './context'
import css from './stars.module.css'

const STAR_COUNT = 40
const fieldRng = createRng()
const fieldRange = createRange(fieldRng)

const createStarCoords = () => ({
  x: fieldRange(0, 100),
  y: fieldRange(0, 75),
})

const SIZE_BANDS = [
  { below: 1, size: 8 },
  { below: 3, size: 6 },
  { below: 6, size: 4 },
] as const

const createSize = () => {
  const seed = fieldRange(0, 20)
  return SIZE_BANDS.find((band) => seed < band.below)?.size ?? 2
}

const ALIVE_ODDS = [
  { below: 10, odds: 1 },
  { below: 20, odds: 0.8 },
  { below: 35, odds: 0.7 },
  { below: 60, odds: 0.5 },
] as const

const createAlive = (y: number) => {
  const odds = ALIVE_ODDS.find((band) => y < band.below)?.odds ?? 0.2
  return fieldRng() < odds
}

const createAnimation = () => {
  if (fieldRng() < 0.2) return ''
  return fieldRng() < 0.6 ? css.twinkling : css.blink
}

const createStars = () => {
  return range(STAR_COUNT).flatMap((id) => {
    const { x, y } = createStarCoords()
    const size = createSize()
    const delay = fieldRange(1, 4)
    const animation = createAnimation()
    return createAlive(y) ? [{ animation, delay, id, size, x, y }] : []
  })
}

const getHidden = (href: string) => sceneFor(href).starsHidden

const stars = createStars()
const SHOOTING_DELAY_MIN_S = 7
const SHOOTING_DELAY_MAX_S = 14
// own rng instance: the shared one advances per prerendered page and breaks hydration
const shootingDelay = createRange(createRng('shooting-star'))(
  SHOOTING_DELAY_MIN_S,
  SHOOTING_DELAY_MAX_S,
)

const ShootingStar: React.FC = () => {
  return (
    <span
      className={css.shooting}
      style={
        {
          '--shooting-delay': `${shootingDelay}s`,
        } as React.CSSProperties
      }
    >
      <span className={cn('start', css.star)} />
    </span>
  )
}

const Stars: React.FC = () => {
  const pathname = usePathname() || '/'
  const { url } = useRouteTransition()
  const hidden = getHidden(url || pathname)

  return (
    <div
      aria-hidden='true'
      className={cn(
        css.field,
        hidden && css.hidden,
        url && !hidden && css.signalLock,
      )}
    >
      <ShootingStar />
      {stars.map(({ y, x, size, delay, id, animation }) => (
        <span
          key={id}
          className={css.appear}
          style={{
            top: `${y}%`,
            left: `${x}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${delay / 2}s`,
          }}
        >
          <span
            className={`${css.star} ${animation}`}
            style={{ animationDelay: `${delay}s` }}
          />
        </span>
      ))}
    </div>
  )
}

export default Stars
