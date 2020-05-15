import React, { useState } from 'react'
import screenfull from 'screenfull'
import css from './tap.module.css'

const Tap: React.FC<{ activate: () => void }> = (props) => {
  const [count, setCount] = useState(13)

  return (
    <button
      className={css.tap}
      onClick={() => {
        if (count > 1) {
          setCount(count - 1)
        } else {
          if (screenfull.isEnabled) {
            screenfull.request()
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
