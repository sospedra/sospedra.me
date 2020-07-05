import React, { useMemo, useRef } from 'react'
import cn from 'classnames'
import { useRouter } from 'next/router'
import { isNotNull } from 'service/structs'
import { createRange, createRng } from 'service/random'
import { useTransition } from './context'
import { createPtr } from './create-ptr'
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
  if (y < 20) return rng.quick() < 0.8
  if (y < 35) return rng.quick() < 0.7
  if (y < 60) return rng.quick() < 0.5
  return rng.quick() < 0.2
}

const createAnimation = () => {
  if (rng.quick() < 0.2) return ''
  return rng.quick() < 0.6 ? css.twinkling : css.blink
}

const createStars = () => {
  return Array(40)
    .fill(0)
    .map((_, id) => {
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
    .filter(isNotNull)
}

const getHidden = (href: string) => {
  const ptr = createPtr(href)
  return ptr('/papers/:slug') || ptr('/about')
}

const stars = createStars()

const ShootingStar: React.FC<{}> = () => {
  const delay = useRef(rrange(30, 8))

  return (
    <span
      className={css.shooting}
      style={{ animationDelay: `${delay.current}s` }}
    >
      <span className={cn('start', { [css.star]: true })} />
    </span>
  )
}

const Stars: React.FC<{}> = () => {
  const { pathname } = useRouter()
  const { url } = useTransition()
  const hidden = useMemo(() => getHidden(url || pathname), [url, pathname])

  if (hidden) return null

  return (
    <div className='absolute inset-0 overflow-hidden'>
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
