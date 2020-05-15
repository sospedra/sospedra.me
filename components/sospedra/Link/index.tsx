import React from 'react'
import { useTransition } from 'service/transition'
import Icon from 'components/sospedra/Icon'
import css from './link.module.css'

const Link = React.forwardRef(
  (
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      url: string
      as?: string
      children: React.ReactNode
      instant?: boolean
    },
    ref?: React.Ref<HTMLAnchorElement>,
  ) => {
    const { as, url, onClick, instant, ...nativeProps } = props
    const transition = useTransition()

    transition.usePrefetch(url)

    return (
      <a
        {...nativeProps}
        ref={ref}
        href={as || url}
        onClick={(e) => {
          e.preventDefault()
          onClick && onClick(e)
          setTimeout(
            () => {
              transition.navigate(url, as)
            },
            instant ? 0 : 360,
          )
        }}
      >
        {props.children}
      </a>
    )
  },
)

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
