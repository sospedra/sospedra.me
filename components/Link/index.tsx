import React from 'react'
import { useTransition } from 'service/transition'
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

export const LinkStyle: React.FC<{
  className: string
}> = (props) => {
  return <a className={`${css.styled} ${props.className}`}>{props.children}</a>
}

export default Link
