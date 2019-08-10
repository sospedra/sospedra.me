import React from 'react'
import { useSpring, animated, interpolate } from 'react-spring'

const styles = {
  width: "20vw",
  height: "20vh",
  position: "absolute",
  top: "250vh",
  left: "60vw",
}

const Satellite = (props) => {
  const satellite = useSpring({
    scale: props.animate ? 0.5 : 1,
    left: props.animate ? 40 : 0,
    top: props.animate ? -240 : 0,
    rotate: props.animate ? 90 : 0,
    from: {
      scale: 1,
      left: 0,
      top: 0,
      rotate: 0,
    },
    config: {
      mass: 4, tension: 180, friction: 200
    },
    delay: 800,
  })

  return (
    <animated.img
      src='http://pixelartmaker.com/art/ab051bcc8492100.png'
      style={{
        ...styles,
        transform: interpolate(
          [satellite.scale, satellite.left, satellite.top, satellite.rotate],
          (scale, left, top, rotate) => `translate(${left}vw, ${top}vh) scale(${scale}) rotate(${rotate}deg)`
        )
      }}
    />
  )
}

export default Satellite