import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMousetrap } from 'service/mousetrap'
import { useShake } from 'service/screen'

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

  useShake(() => {
    setIsActive((x) => !x)
  })

  return (
    <>
      {isActive && <Egg />}
      {props.children}
    </>
  )
}

export default EasterEgg
