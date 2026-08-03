import type React from 'react'
import { useState } from 'react'
import { useInterval } from './interval'
import css from './tap.module.css'

const TAP_TARGET = 13
const REGROW_MS = 750
const LAUNCH_VIBRATION_MS = [125, 75, 275]

const Tap: React.FC<{
  activate: () => void
  activateThenExitFullscreen: () => void
}> = (props) => {
  const [count, setCount] = useState(TAP_TARGET)

  useInterval(() => {
    // the count regrows between taps: the launch demands a fast burst
    if (count < TAP_TARGET) {
      setCount(count + 1)
    }
  }, REGROW_MS)

  const launch = async () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(LAUNCH_VIBRATION_MS)
    }

    if (!document.fullscreenEnabled || document.fullscreenElement) {
      props.activate()
      return
    }

    try {
      await document.documentElement.requestFullscreen()
      props.activateThenExitFullscreen()
    } catch {
      props.activate()
    }
  }

  return (
    <button
      type='button'
      className={css.tap}
      onClick={() => {
        if (count > 1) {
          setCount(count - 1)
          return
        }
        void launch()
      }}
    >
      <div className={css.count}>
        <span>{count}</span>
      </div>
    </button>
  )
}

export default Tap
