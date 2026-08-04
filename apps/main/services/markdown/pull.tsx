import type React from 'react'
import css from './pull.module.css'

// Pull quotes repeat a line the body already carries: decorative for readers, noise for screen readers.
const Pull: React.FC<{ children: React.ReactNode }> = (props) => (
  <aside aria-hidden='true' className={css.pull}>
    {props.children}
  </aside>
)

export default Pull
