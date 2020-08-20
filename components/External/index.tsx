import React from 'react'
import css from 'service/style/neon.module.css'

export const TWITTER = 'https://twitter.com/sospedra_r'

const External: React.FC<{ href: string; className?: string }> = (props) => {
  return (
    <a
      className={props.className || css.neon}
      href={props.href}
      rel='noopener noreferrer'
      target='_blank'
    >
      {props.children}
    </a>
  )
}

export default External
