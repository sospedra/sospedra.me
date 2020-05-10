import React, { useMemo } from 'react'
import { pathToRegexp } from 'path-to-regexp'
import { useSpring, animated, config } from 'react-spring'
import { useRouter } from 'next/router'
import { useTransition } from './context'
import css from './transition.module.css'

type OffsetT = {
  left: string
  top: string
}

const createPtr = (href: string) => {
  return (pattern: string) => {
    return pathToRegexp(pattern).exec(href) !== null
  }
}

const getOffsetFromHref = (href: string): OffsetT => {
  const ptr = createPtr(href)
  switch (true) {
    case ptr('/papers'):
      return { left: '0vw', top: '-50vh' }
    case ptr('/papers/:slug'):
      return { left: '0vw', top: '0vh' }
    case ptr('/about'):
      return { left: '-100vw', top: '-50vh' }
    case ptr('/'):
    default:
      return { left: '0vw', top: '-300vh' }
  }
}

const Animation: React.FunctionComponent<{
  setAnimation: Function
  animation: Object
}> = (props) => {
  const { pathname } = useRouter()
  const { url } = useTransition()

  useMemo(() => {
    props.setAnimation(getOffsetFromHref(url || pathname))
  }, [pathname, url])

  return <animated.div className={css.bg} style={props.animation} />
}

const Background: React.FunctionComponent<{}> = () => {
  const { pathname } = useRouter()
  const { unmount } = useTransition()
  const [animation, setAnimation] = useSpring(() => ({
    to: getOffsetFromHref(pathname),
    config: config.molasses,
    onStart: () => {
      setTimeout(unmount, 360)
    },
  }))

  return (
    <div className={css.wrapper}>
      <Animation setAnimation={setAnimation} animation={animation} />
    </div>
  )
}

export default Background
