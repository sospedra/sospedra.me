import type React from 'react'
import back from './icons/back.svg'
import close from './icons/close.svg'
import cursor from './icons/cursor.svg'
import github from './icons/github.svg'
import hourglass from './icons/hourglass.svg'
import minus from './icons/minus.svg'
import pizza from './icons/pizza.svg'
import pizzaBox from './icons/pizza-box.png'
import plus from './icons/plus.svg'
import web from './icons/web.svg'

const ICONS = {
  back,
  close,
  cursor,
  github,
  hourglass,
  minus,
  pizza,
  'pizza-box': pizzaBox,
  plus,
  web,
}

export type IconName = keyof typeof ICONS

const Icon: React.FC<{
  name: IconName
  className?: string
}> = ({ name, className = '' }) => {
  const icon = ICONS[name]
  return (
    <img
      src={icon.src}
      width={icon.width}
      height={icon.height}
      className={`min-w-6 h-6 inline-flex ${className}`}
      alt=''
    />
  )
}

export default Icon
