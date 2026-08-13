import cn from 'clsx'
import type React from 'react'
import SystemSettings from 'services/system-settings'
import StageMain from 'services/transition/stage'
import { VBODY_ID } from 'services/vbody'

type ShellProps = {
  className?: string
  shellClassName?: string
  stage?: boolean
  children: React.ReactNode
}

const Shell = ({
  children,
  className,
  shellClassName = '',
  stage = false,
}: ShellProps) => {
  return (
    <>
      <a className='skip-link' href='#main-content'>
        Skip to content ▼
      </a>
      <SystemSettings />
      {/* grid 1fr: main stretches to a definite viewport height, so the
          height: 100% chains in full-viewport routes keep resolving.
          minmax(0, 1fr): an auto column would grow to main's min-content
          and code blocks would push papers past the phone viewport */}
      <div
        id={VBODY_ID}
        className={cn(
          'w-full min-h-dvh grid grid-rows-[1fr] grid-cols-[minmax(0,1fr)]',
          shellClassName,
        )}
      >
        {stage ? (
          <StageMain className={className}>{children}</StageMain>
        ) : (
          <main
            id='main-content'
            tabIndex={-1}
            className={cn('site-main', className)}
          >
            {children}
          </main>
        )}
      </div>
    </>
  )
}

export default Shell
