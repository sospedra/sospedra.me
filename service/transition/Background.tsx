import React, { useMemo } from 'react'
import { useSpring, animated, config } from '@react-spring/web'
import { useRouter } from 'next/router'
import { useTransition } from './context'
import { createPtr } from './create-ptr'
import Stars from './Stars'
import css from './transition.module.css'

type OffsetT = {
  left: string
  top: string
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
    case ptr('/bazaar'):
      return { left: '-30vw', top: '-300vh' }
    case ptr('/'):
    default:
      return { left: '0vw', top: '-250vh' }
  }
}

const Animation: React.FunctionComponent<{
  start: (offset: OffsetT) => unknown
  animation: object
}> = (props) => {
  const { pathname } = useRouter()
  const { url } = useTransition()

  // useMemo, not useEffect: the pan must start on render, before paint
  useMemo(() => {
    props.start(getOffsetFromHref(url || pathname))
  }, [pathname, url])

  return <animated.div className={css.bg} style={props.animation} />
}

const Background: React.FunctionComponent<{}> = () => {
  const { pathname } = useRouter()
  const { unmount } = useTransition()
  const [animation, api] = useSpring(() => ({
    to: getOffsetFromHref(pathname),
    config: config.molasses,
    onStart: () => {
      setTimeout(unmount, 360)
    },
  }))

  return (
    <div className={css.wrapper}>
      <Animation start={(offset) => api.start(offset)} animation={animation} />
      <Stars />
    </div>
  )
}

export default Background
