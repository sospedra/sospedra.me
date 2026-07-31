import cn from 'clsx'
import { isNotNil, range } from 'es-toolkit'
import { createRange, createRng } from 'lib/random'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { sceneFor } from './altitude'
import { useTransition } from './context'
import css from './stars.module.css'

const rrange = createRange()
const rng = createRng()
const createCoords = () => ({ x: rrange(100), y: rrange(75) })
const createSize = () => {
  const seed = rrange(20)
  if (seed < 1) return 8
  if (seed < 3) return 6
  if (seed < 6) return 4
  return 2
}

const createAlive = (y: number) => {
  if (y < 10) return true
  if (y < 20) return rng() < 0.8
  if (y < 35) return rng() < 0.7
  if (y < 60) return rng() < 0.5
  return rng() < 0.2
}

const createAnimation = () => {
  if (rng() < 0.2) return ''
  return rng() < 0.6 ? css.twinkling : css.blink
}

const createStars = () => {
  return range(40)
    .map((id) => {
      const { x, y } = createCoords()
      const size = createSize()
      const delay = rrange(4, 1)
      const animation = createAnimation()
      const alive = createAlive(y)
      const star = {
        animation,
        delay,
        id,
        size,
        x,
        y,
      }

      return alive ? star : null
    })
    .filter(isNotNil)
}

const getHidden = (href: string) => sceneFor(href).starsHidden

const stars = createStars()
// own rng instance: the shared one advances per prerendered page and breaks hydration
const shootingDelay = createRange(createRng('shooting-star'))(14, 7)

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
  const { url } = useTransition()
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
