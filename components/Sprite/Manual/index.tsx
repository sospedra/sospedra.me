import React from 'react'
import count from './count.svg'
import demons from './demons.svg'
import gameboy from './gameboy.svg'
import handshake from './handshake.svg'
import home from './home.svg'
import insert from './insert.svg'
import lost from './lost.svg'
import mobius from './mobius.svg'
import support from './support.svg'
import triangle from './triangle.svg'

const sprites = {
  count,
  demons,
  gameboy,
  handshake,
  home,
  insert,
  lost,
  mobius,
  support,
  triangle,
}

const SpriteManual: React.FC<{
  name: keyof typeof sprites
  className?: string
}> = (props) => {
  const sprite = sprites[props.name]

  return (
    <>
      <link rel='preload' as='image' href={sprite.src} />
      <img src={sprite.src} className={`h-full p-4 ${props.className || ''}`} />
    </>
  )
}

export default SpriteManual
