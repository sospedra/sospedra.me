import * as React from 'react'
import { useSpring, animated, config } from 'react-spring'
import { useRouter } from 'next/router'
import { useTransition } from '../service/transition'

type OffsetT = {
  left: string,
  top: string,
}

const styles = {
  background: "linear-gradient(to bottom, #2c052a 0%, #800d79 50%)",
  width: "400vw",
  height: "400vh",
  position: "absolute" as "absolute",
  top: 0,
  left: 0,
}

const getOffsetFromHref = (href: string): OffsetT => {
  switch (href) {
    case "/about": return { left: "-150vw", top: "-300vh" }
    case "/initial-props": return { left: "0vw", top: "0vh" }
    case "/":
    default: return { left: "0vw", top: "-300vh" }
  }
}

const Animation: React.FunctionComponent<{
  setAnimation: Function,
  animation: Object,
}> = (props) => {
  const { pathname } = useRouter()
  const { href } = useTransition()

  React.useMemo(() => {
    props.setAnimation(getOffsetFromHref(href || pathname))
  }, [pathname, href])

  return (
    <animated.div style={{ ...styles, ...props.animation }} />
  )
}

const Background: React.FunctionComponent<{}> = () => {
  const { pathname } = useRouter()
  const { unmount } = useTransition()
  const [animation, setAnimation] = useSpring(() => ({
    to: getOffsetFromHref(pathname),
    config: config.molasses,
    onStart: () => setTimeout(unmount, 360),
  }))

  return (
    <React.Fragment>
      <div className="wrapper">
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
    </React.Fragment>
  )
}

export default Background
