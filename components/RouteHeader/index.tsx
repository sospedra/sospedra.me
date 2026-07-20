import cn from 'clsx'
import Link, { LinkBack } from 'components/Link'
import type { Route } from 'next'
import type React from 'react'
import css from './route-header.module.css'

type Props = {
  backHref?: Route
  backLabel?: string
  children?: React.ReactNode
  className?: string
  description?: React.ReactNode
  sector: string
  status: string
  title: string
}

export default function RouteHeader({
  backHref = '/',
  backLabel = 'Home',
  children,
  className,
  description,
  sector,
  status,
  title,
}: Props) {
  return (
    <header className={cn(css.header, className)}>
      <div className={css.utilityRow}>
        <Link url={backHref} className={css.backLink}>
          <LinkBack>{backLabel}</LinkBack>
        </Link>
        <p className={css.telemetry}>
          <span>SECTOR {sector}</span>
          <span aria-hidden='true'>/</span>
          <span>{status}</span>
        </p>
      </div>
      <div className={css.titleRow}>
        <div>
          <h1>{title}</h1>
          {description && <div className={css.description}>{description}</div>}
        </div>
        {children}
      </div>
    </header>
  )
}
