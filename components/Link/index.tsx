import React from 'react'
import { useTransition } from 'service/transition'
import Icon from 'components/Icon'
import css from './link.module.css'

const Link: React.FC<{
  onClick?: (event?: React.SyntheticEvent) => any
  instant?: boolean
  url: string
  as?: string
}> = (props) => {
  const transition = useTransition()

  transition.usePrefetch(props.url)

  return (
    <a
      href={props.as || props.url}
      onClick={(e) => {
        e.preventDefault()
        props.onClick && props.onClick(e)
        setTimeout(
          () => {
            transition.navigate(props.url, props.as)
          },
          props.instant ? 0 : 360,
        )
      }}
    >
      {props.children}
    </a>
  )
}

export const LinkBack: React.FC<{
  className?: string
}> = (props) => {
  return (
    <nav className={`${css.back} ${props.className}`}>
      <Icon name='back.svg' />
      <span>{props.children}</span>
    </nav>
  )
}

export default Link
