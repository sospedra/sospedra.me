import dynamic from 'next/dynamic'
import type React from 'react'
import { useState } from 'react'
import { trigger, useHotkeys } from 'service/hotkeys'
import { useShake } from 'service/screen'
import { useSystem } from 'service/system'
import { useLog } from './log'

const Egg = dynamic(() => import('./Egg'))
const Tap = dynamic(() => import('./Tap'))

const EasterEgg: React.FC<{ children: React.ReactNode }> = (props) => {
  const [isActive, setIsActive] = useState(false)
  const [isTapVisible, setIsTapVisible] = useState(false)
  const { discover } = useSystem()

  useHotkeys([
    [
      'ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a',
      () => {
        discover('konami')
        setIsActive((x) => !x)
      },
    ],
  ])

  useShake(() => {
    trigger('Escape')
    setIsTapVisible(true)
  })

  useLog()

  return (
    <>
      {isTapVisible && !isActive && <Tap activate={() => setIsActive(true)} />}
      {isActive && <Egg />}
      {props.children}
    </>
  )
}

export default EasterEgg
