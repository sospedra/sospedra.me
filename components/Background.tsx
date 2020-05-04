import React, { useMemo } from 'react'
import { pathToRegexp } from 'path-to-regexp'
import { useSpring, animated, config } from 'react-spring'
import { useRouter } from 'next/router'
import { useTransition } from '../service/transition'

type OffsetT = {
  left: string
  top: string
}

const ptr = (pattern: string, href: string) => {
  return pathToRegexp(pattern).exec(href) !== null
}

const getOffsetFromHref = (href: string): OffsetT => {
  switch (true) {
    case ptr('/papers/:slug?', href):
      return { left: '0vw', top: '0vh' }
    case ptr('/', href):
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

  return (
    <animated.div
      style={{
        background:
          'linear-gradient(to bottom, var(--bg-start) 0%, var(--bg-end) 60%)',
        width: '400vw',
        height: '400vh',
        position: 'absolute',
        ...props.animation,
      }}
    />
  )
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
    <>
      <div className='wrapper'>
        <Animation setAnimation={setAnimation} animation={animation} />
      </div>
      <style jsx>{`
        .wrapper {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: absolute;
          z-index: -1;
        }
      `}</style>
    </>
  )
}

export default Background
