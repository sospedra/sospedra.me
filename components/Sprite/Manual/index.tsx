import cn from 'clsx'
import type React from 'react'
import count from './count.svg'
import demons from './demons.svg'
import gameboy from './gameboy.svg'
import handshake from './handshake.svg'
import home from './home.svg'
import insert from './insert.svg'
import lost from './lost.svg'
import css from './manual.module.css'
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
    <img
      alt={props.name}
      src={sprite.src}
      width={sprite.width}
      height={sprite.height}
      loading='lazy'
      decoding='async'
      className={cn(css.sprite, props.className)}
    />
  )
}

export default SpriteManual
