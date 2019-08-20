import React from 'react'
import { useTransition } from '../service/transition'

type Props = {
  children: React.ReactNode,
  onClick?: (event?: React.SyntheticEvent) => void,
  href: string,
}

const Link: React.FunctionComponent<Props> = ({
  children,
  onClick,
  href,
}) => {
  const transition = useTransition()

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        transition.navigate(href)
        onClick && onClick(e)
      }}
    >
      {children}
    </a>
  )
}

export default Link
