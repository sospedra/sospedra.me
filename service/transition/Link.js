import React from 'react'
import Router from 'next/router'

import { useTransition } from './index'

export const Link = (props) => {
  const transition = useTransition()

  useEffect(() => {
    if (transition.hasRequestedUnmount && transition.willUnmount) {
      Router.push(props.href)
      transition.reset()
    }
  }, [transition.hasRequestedUnmount, transition.willUnmount])

  return (
    <a
      href={props.href}
      onClick={(e) => {
        e.preventDefault()
        transition.requestUnmount()
        props.onClick && props.onClick(e, transition)
      }}
    >
      {props.children}
    </a>
  )
}
