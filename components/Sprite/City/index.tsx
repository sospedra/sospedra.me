import { animated, config, useSpring } from '@react-spring/web'
import type React from 'react'
import css from './city.module.css'

const SpriteCity: React.FunctionComponent = () => {
  const animation = useSpring({
    from: { transform: 'translate(0vw)' },
    to: { transform: 'translate(-100vw)' },
    config: config.slow,
  })

  return (
    <>
      <link rel='preload' as='image' href={'/images/street.svg'} />
      <animated.figure className={css.city} style={animation} />
    </>
  )
}

export default SpriteCity
