import React, { useState, useEffect } from 'react'
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
  if (seed < 1) return 5
  if (seed < 3) return 3
  if (seed < 6) return 2
  return 1
}

const createAlive = (y: number) => {
  if (y < 10) return true
  if (y < 20) return Math.random() < 0.8
  if (y < 35) return Math.random() < 0.7
  if (y < 60) return Math.random() < 0.5
  return Math.random() < 0.2
}

const createStars = () => {
  return Array(100)
    .fill(0)
    .map((_, id) => {
      const { x, y } = createCoords()
      const size = createSize()
      const alive = createAlive(y)
      const delay = ranrang(1, 4)
      const star = {
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

const Stars: React.FC<{}> = () => {
  const { pathname } = useRouter()
  const { url } = useTransition()
  const [hidden, setHidden] = useState(getHidden(url || pathname))

  useEffect(() => {
    console.log('calc', getHidden(url || pathname))
    setHidden(getHidden(url || pathname))
  }, [url, pathname])

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden transition-opacity duration-1000',
        {
          'opacity-0': hidden,
        },
      )}
    >
      {stars.map(({ y, x, size, delay, id }) => (
        <span
          key={id}
          className={css.star}
          style={{
            top: `${y}%`,
            left: `${x}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${delay}s`,
          }}
        >
          <span
            className={css.appear}
            style={{ animationDelay: `${delay}s` }}
          />
        </span>
      ))}
    </div>
  )
}

export default Stars
