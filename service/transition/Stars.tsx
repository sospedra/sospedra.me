import React, { useMemo } from 'react'
import cn from 'classnames'
import { useRouter } from 'next/router'
import { isNotNull } from 'service/structs'
import { useTransition } from './context'
import { createPtr } from './create-ptr'
import css from './stars.module.css'

const ranrang = (min = 0, max = 100) => Math.random() * (max - min) + min
const createCoords = () => ({ x: ranrang(), y: ranrang(0, 75) })
const createSize = () => {
  const seed = ranrang(0, 20)
  if (seed < 1) return 8
  if (seed < 3) return 6
  if (seed < 6) return 4
  return 2
}

const createAlive = (y: number) => {
  if (y < 10) return true
  if (y < 20) return Math.random() < 0.8
  if (y < 35) return Math.random() < 0.7
  if (y < 60) return Math.random() < 0.5
  return Math.random() < 0.2
}

const createAnimation = () => {
  const seed = Math.random()
  if (seed < 0.2) return ''
  return seed < 0.6 ? css.twinkling : css.blink
}

const createStars = () => {
  return Array(40)
    .fill(0)
    .map((_, id) => {
      const { x, y } = createCoords()
      const size = createSize()
      const delay = Math.round(ranrang(1, 4))
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
  switch (true) {
    case ptr('/papers'):
    case ptr('/'):
      return false
    default:
      return true
  }
}

const stars = createStars()

const ShootingStar: React.FC<{}> = () => {
  return (
    <span
      className={css.shooting}
      style={{ animationDelay: `${ranrang(8, 110)}s` }}
    >
      <span className={cn('start', { [css.star]: true })} />
    </span>
  )
}

const Stars: React.FC<{}> = () => {
  const { pathname } = useRouter()
  const { url } = useTransition()
  const hidden = useMemo(() => getHidden(url || pathname), [url, pathname])

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden transition-opacity duration-1000',
        {
          'opacity-0': hidden,
        },
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
