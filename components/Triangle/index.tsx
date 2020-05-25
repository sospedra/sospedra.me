import React from 'react'
import cn from 'classnames'
import css from './triangle.module.css'

const Triangle: React.FC<{}> = () => {
  return (
    <>
      <div className={css.triangle} />
      <div
        className={cn({
          [css.triangle]: true,
          [css.blur]: true,
        })}
      />
    </>
  )
}

export default Triangle
