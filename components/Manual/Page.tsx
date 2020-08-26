import React from 'react'
import cn from 'classnames'
import css from './page.module.css'

const Page: React.FC<{ className?: string }> = (props) => {
  return (
    <section className={cn(css.page, props.className)}>
      {props.children}
    </section>
  )
}

export default Page
