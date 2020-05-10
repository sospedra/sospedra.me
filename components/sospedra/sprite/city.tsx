import React from 'react'
import { config, animated, useSpring } from 'react-spring'
import css from './city.module.css'

const SpriteCity: React.FunctionComponent<{}> = () => {
  const animation = useSpring({
    from: { transform: 'translate(0vw)' },
    to: { transform: 'translate(-100vw)' },
    config: config.slow,
  })

  return <animated.figure className={css.city} style={animation} />
}

export default SpriteCity
