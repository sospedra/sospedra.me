import React from 'react'
import { useTransition } from '../service/transition'

type Props = {
  children: React.ReactNode
  onClick?: (event?: React.SyntheticEvent) => any
  href: string
}

const Link: React.FunctionComponent<Props> = ({
  children,
  onClick = () => {},
  href,
}) => {
  const transition = useTransition()

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        onClick(e)
        setTimeout(() => {
          transition.navigate(href)
        }, 360)
      }}
    >
      {children}
    </a>
  )
}

export default Link
