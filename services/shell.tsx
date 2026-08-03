import cn from 'clsx'
import type React from 'react'
import StageMain from 'services/transition/stage'

// the scroll surface: hotkeys and page effects resolve it by this id
export const VBODY_ID = 'vbody'

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
      <div
        id={VBODY_ID}
        style={{ overscrollBehavior: 'contain' }}
        className={cn(
          'w-full h-full overflow-x-hidden overflow-y-auto',
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
