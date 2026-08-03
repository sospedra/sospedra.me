import { animated, useReducedMotion, useSpring } from '@react-spring/web'
import cn from 'clsx'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'services/theme'
import { sceneFor } from './altitude'
import { useRouteTransition } from './context'
import Stars from './stars'
import css from './transition.module.css'

type OffsetT = {
  transform: string
}

const ROUTE_SPRING = {
  tension: 150,
  friction: 34,
  mass: 1.15,
}

const getOffsetFromHref = (href: string): OffsetT => ({
  transform: sceneFor(href).offset,
})

const Animation: React.FunctionComponent<{
  start: (offset: OffsetT, immediate: boolean, onRest: () => void) => unknown
  animation: object
  isQuiet: boolean
}> = ({ start, animation, isQuiet }) => {
  const pathname = usePathname() || '/'
  const { url } = useRouteTransition()
  const movement = useRef(0)
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    const id = ++movement.current
    setIsMoving(!isQuiet)
    start(getOffsetFromHref(url || pathname), isQuiet, () => {
      if (id === movement.current) setIsMoving(false)
    })
  }, [isQuiet, pathname, start, url])

  return (
    <animated.div
      aria-hidden='true'
      className={cn(css.bg, isMoving && css.moving)}
      style={animation}
    />
  )
}

const Background: React.FunctionComponent = () => {
  const pathname = usePathname() || '/'
  const prefersReducedMotion = useReducedMotion()
  const { fxMode } = useTheme()
  const isQuiet = Boolean(prefersReducedMotion) || fxMode === 'quiet'
  const [animation, api] = useSpring(() => ({
    to: getOffsetFromHref(pathname),
    config: ROUTE_SPRING,
  }))

  return (
    <div className={css.wrapper}>
      <Animation
        start={(offset, immediate, onRest) =>
          api.start({ ...offset, immediate, onRest })
        }
        animation={animation}
        isQuiet={isQuiet}
      />
      <Stars />
    </div>
  )
}

export default Background
