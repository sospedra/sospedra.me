import type React from 'react'
import { useState } from 'react'
import { useInterval } from './interval'
import css from './tap.module.css'

const Tap: React.FC<{ activate: (exitFullscreen?: boolean) => void }> = (
  props,
) => {
  const [count, setCount] = useState(13)

  useInterval(() => {
    if (count < 13) {
      setCount(count + 1)
    }
  }, 750)

  const launch = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([125, 75, 275])
    }

    if (!document.fullscreenEnabled || document.fullscreenElement) {
      props.activate(false)
      return
    }

    document.documentElement
      .requestFullscreen()
      .then(() => props.activate(true))
      .catch(() => props.activate(false))
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
        launch()
      }}
    >
      <div className={css.count}>
        <span>{count}</span>
      </div>
    </button>
  )
}

export default Tap
