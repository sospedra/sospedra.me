import React, { useRef } from 'react'
import Head from 'next/head'

const sprites = {
  count: require('./count.svg'),
  demons: require('./demons.svg'),
  gameboy: require('./gameboy.svg'),
  handshake: require('./handshake.svg'),
  home: require('./home.svg'),
  insert: require('./insert.svg'),
  lost: require('./lost.svg'),
  mobius: require('./mobius.svg'),
  support: require('./support.svg'),
  triangle: require('./triangle.svg'),
}

const SpriteManual: React.FC<{
  name: keyof typeof sprites
  className?: string
}> = (props) => {
  const { current: sprite } = useRef(sprites[props.name])

  return (
    <>
      <Head>
        <link rel='preload' as='image' href={sprite} />
      </Head>
      <img src={sprite} className={`h-full p-4 ${props.className || ''}`} />
    </>
  )
}

export default SpriteManual
