import React, { useState } from 'react'
import { useMousetrap } from 'service/mousetrap'
import dynamic from 'next/dynamic'

const Egg = dynamic(() => import('./Egg'))

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
      {isActive && <Egg />}
      {props.children}
    </>
  )
}

export default EasterEgg
