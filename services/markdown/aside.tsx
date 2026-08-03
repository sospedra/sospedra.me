import type React from 'react'
import css from './aside.module.css'

const Aside: React.FC<{ label?: string; children: React.ReactNode }> = (
  props,
) => (
  <aside className={css.aside}>
    {props.label ? <span className={css.label}>{props.label}</span> : null}
    <div className={css.body}>{props.children}</div>
  </aside>
)

export default Aside
