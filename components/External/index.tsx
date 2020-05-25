import React from 'react'
import css from 'service/style/neon.module.css'

const External: React.FC<{ href: string }> = (props) => {
  return (
    <a
      className={css.neon}
      href={props.href}
      rel='noopener noreferrer'
      target='_blank'
    >
      {props.children}
    </a>
  )
}

export default External
