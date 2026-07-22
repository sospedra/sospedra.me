import { animated, useReducedMotion, useSpring } from '@react-spring/web'
import cn from 'clsx'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTransition } from './context'
import { createPtr } from './create-ptr'
import Stars from './Stars'
import css from './transition.module.css'

type OffsetT = {
  transform: string
}

const ROUTE_SPRING = {
  tension: 150,
  friction: 34,
  mass: 1.15,
}

const getOffsetFromHref = (href: string): OffsetT => {
  const ptr = createPtr(href)
  switch (true) {
    case ptr('/papers'):
      return { transform: 'translate3d(0vw, -250vh, 0)' }
    case ptr('/papers/:slug'):
      return { transform: 'translate3d(0vw, 0vh, 0)' }
    case ptr('/about'):
      return { transform: 'translate3d(-100vw, -400vh, 0)' }
    case ptr('/bazaar'):
      return { transform: 'translate3d(-300vw, -250vh, 0)' }
    default:
      return { transform: 'translate3d(0vw, -400vh, 0)' }
  }
}

const useFxQuiet = () => {
  const [isQuiet, setIsQuiet] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsQuiet(root.classList.contains('fx-quiet'))
    const observer = new MutationObserver(sync)

    sync()
    observer.observe(root, { attributeFilter: ['class'], attributes: true })
    return () => observer.disconnect()
  }, [])

  return isQuiet
}

const Animation: React.FunctionComponent<{
  start: (offset: OffsetT, immediate: boolean, onRest: () => void) => unknown
  animation: object
  isQuiet: boolean
}> = ({ start, animation, isQuiet }) => {
  const pathname = usePathname() || '/'
  const { url } = useTransition()
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
  const fxQuiet = useFxQuiet()
  const isQuiet = Boolean(prefersReducedMotion || fxQuiet)
  const [animation, api] = useSpring(() => ({
    to: getOffsetFromHref(pathname),
    config: ROUTE_SPRING,
  }))

  return (
    <div className={css.wrapper}>
      {/* arrow keeps api's this-binding, the compiler keeps its identity stable */}
      <Animation
        start={(offset, immediate, onRest) =>
          api.start({
            ...offset,
            config: ROUTE_SPRING,
            immediate,
            onRest,
          })
        }
        animation={animation}
        isQuiet={isQuiet}
      />
      <Stars />
    </div>
  )
}

export default Background
