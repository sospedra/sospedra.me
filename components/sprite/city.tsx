import React from 'react'
import { config, animated, useSpring } from 'react-spring'

const styles = {
  backgroundSize: 'contain',
  bottom: 0,
  height: '50vh',
  left: 0,
  position: 'absolute' as 'absolute',
  width: '200vw',
  backgroundImage: 'url(/street-sprite.svg)',
  zIndex: -1,
  margin: 0,
}

const SpriteCity: React.FunctionComponent<{}> = () => {
  const animation = useSpring({
    from: { transform: 'translate(0vw)' },
    to: { transform: 'translate(-100vw)' },
    config: config.slow,
  })

  return <animated.figure style={{ ...styles, ...animation }} />
}

export default SpriteCity
