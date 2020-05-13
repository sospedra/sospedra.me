import React, { useState } from 'react'
import { useMousetrap } from 'service/mousetrap'
import css from './easteregg.module.css'

const EasterEgg: React.FC<{}> = (props) => {
  const [isActive, setIsActive] = useState(false)
  useMousetrap([
    [
      'up up down down left right left right b a',
      () => {
        setIsActive((x) => !x)
      },
    ],
  ])

  return (
    <>
      {isActive && <div className={css.green} />}
      {props.children}
    </>
  )
}

export default EasterEgg
