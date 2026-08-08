import cn from 'clsx'
import type React from 'react'
import { GoBack, LinkBack } from 'services/link'
import css from './route-header.module.css'

type Props = {
  children?: React.ReactNode
  className?: string
  description?: React.ReactNode
  sector: string
  status: string
  title: string
}

export default function RouteHeader({
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
        <GoBack className={css.backLink}>
          <LinkBack>Back</LinkBack>
        </GoBack>
        <p className={css.telemetry}>
          <span>SECTOR {sector}</span>
          <span aria-hidden='true'>/</span>
          <span>{status}</span>
        </p>
      </div>
      <div className={css.titleRow}>
        <div>
          <h1>{title}</h1>
          {description ? (
            <div className={css.description}>{description}</div>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  )
}
