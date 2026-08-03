import cn from 'clsx'
import type React from 'react'
import css from './triangle.module.css'

const Triangle: React.FC = () => {
  return (
    <>
      <div className={css.triangle} />
      <div className={cn(css.triangle, css.blur)} />
    </>
  )
}

export default Triangle
