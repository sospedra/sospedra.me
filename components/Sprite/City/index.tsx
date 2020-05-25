import React from 'react'
import Head from 'next/head'
import { config, animated, useSpring } from 'react-spring'
import css from './city.module.css'

const SpriteCity: React.FunctionComponent<{}> = () => {
  const animation = useSpring({
    from: { transform: 'translate(0vw)' },
    to: { transform: 'translate(-100vw)' },
    config: config.slow,
  })

  return (
    <>
      <Head>
        <link rel='preload' as='image' href={require('./street.svg')} />
      </Head>
      <animated.figure className={css.city} style={animation} />
    </>
  )
}

export default SpriteCity
