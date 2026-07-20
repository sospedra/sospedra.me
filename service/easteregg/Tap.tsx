import type React from 'react'
import { useState } from 'react'
import { useInterval } from './interval'
import css from './tap.module.css'

const Tap: React.FC<{ activate: () => void }> = (props) => {
  const [count, setCount] = useState(13)

  useInterval(() => {
    if (count < 13) {
      setCount(count + 1)
    }
  }, 750)

  return (
    <button
      type='button'
      className={css.tap}
      onClick={() => {
        if (count > 1) {
          setCount(count - 1)
        } else {
          if (document.fullscreenEnabled) {
            // best effort: a denied fullscreen must not block activation
            document.documentElement.requestFullscreen().catch(() => {})
          }
          if ('vibrate' in navigator) {
            navigator.vibrate([125, 75, 275])
          }

          props.activate()
        }
      }}
    >
      <div className={css.count}>
        <span>{count}</span>
      </div>
    </button>
  )
}

export default Tap
