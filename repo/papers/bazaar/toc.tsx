import type React from 'react'
import { pad } from './pad'
import css from './toc.module.css'

const Toc: React.FC<{ items: { href: string; title: string }[] }> = (props) => (
  <nav aria-label='Table of contents' className={css.toc}>
    <span className={css.label}>{'Index // Transmission'}</span>
    <ol className={css.list}>
      {props.items.map((item, i) => (
        <li className={css.item} key={item.href}>
          <a className={css.link} href={item.href}>
            <span className={css.number}>{pad(i + 1)}</span>
            {item.title}
          </a>
        </li>
      ))}
    </ol>
  </nav>
)

export default Toc
