import React from 'react'
import { useTransition } from '../service/transition'

const Link: React.FC<{
  onClick?: (event?: React.SyntheticEvent) => any
  url: string
  as?: string
}> = (props) => {
  const transition = useTransition()

  return (
    <a
      href={props.as || props.url}
      onClick={(e) => {
        e.preventDefault()
        props.onClick && props.onClick(e)
        setTimeout(() => {
          transition.navigate(props.url, props.as)
        }, 360)
      }}
    >
      {props.children}
    </a>
  )
}

export default Link
