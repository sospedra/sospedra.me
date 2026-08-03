import type React from 'react'
import css from 'services/style/neon.module.css'

export const X_PROFILE_URL = 'https://x.com/sospedra_r'

const External: React.FC<
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    children: React.ReactNode
  }
> = ({ children, className, ...nativeProps }) => {
  return (
    <a
      {...nativeProps}
      className={className || css.neon}
      rel='noopener noreferrer'
      target='_blank'
    >
      {children}
    </a>
  )
}

export default External
