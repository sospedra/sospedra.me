import cn from 'clsx'
import type React from 'react'
import css from './pictogram.module.css'

const Pictogram: React.FC<{
  left: React.ReactNode
  right: React.ReactNode
  style?: React.CSSProperties
  willHide?: boolean
}> = ({ left, right, style = {}, willHide = false }) => {
  return (
    <div className={css.pictogram} style={style}>
      <div
        className={cn(css.panel, {
          [css.optional]: willHide,
        })}
      >
        {left}
      </div>
      <div className={css.panel}>{right}</div>
    </div>
  )
}

export default Pictogram
