import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMousetrap } from 'service/mousetrap'
import { useShake } from 'service/screen'

const Egg = dynamic(() => import('./Egg'))
const Tap = dynamic(() => import('./Tap'))

const EasterEgg: React.FC<{}> = (props) => {
  const [isActive, setIsActive] = useState(false)
  const [isTapVisible, setIsTapVisible] = useState(false)

  useMousetrap([
    [
      'up up down down left right left right b a',
      () => {
        setIsActive((x) => !x)
      },
    ],
  ])

  useShake(() => {
    setIsTapVisible((x) => !x)
  })

  return (
    <>
      {isTapVisible && !isActive && <Tap activate={() => setIsActive(true)} />}
      {isActive && <Egg />}
      {props.children}
    </>
  )
}

export default EasterEgg
