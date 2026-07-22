import cn from 'clsx'
import type React from 'react'
import css from './page.module.css'

const Page: React.FC<{
  className?: string
  children: React.ReactNode
  wear?: 'stapled' | 'stained' | 'creased' | 'folded'
}> = (props) => {
  return (
    <section className={cn(css.page, props.className)} data-manual-page=''>
      {props.wear ? (
        <span
          className={css.sheetWear}
          data-wear={props.wear}
          aria-hidden='true'
        />
      ) : null}
      {props.children}
    </section>
  )
}

export default Page
