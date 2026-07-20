import cn from 'clsx'
import type React from 'react'

type ShellProps = {
  canonical: string
  className?: string
  description?: string
  image?: string
  shellClassName?: string
  title?: string
  keywords?: string[]
  children: React.ReactNode
}

const Shell = ({ children, className, shellClassName = '' }: ShellProps) => {
  return (
    <>
      <a className='skip-link' href='#main-content'>
        Skip to content ▼
      </a>
      <div
        id='vbody'
        style={{ overscrollBehavior: 'contain' }}
        className={cn(
          'w-full h-full overflow-x-hidden overflow-y-auto',
          shellClassName,
        )}
      >
        <main
          id='main-content'
          tabIndex={-1}
          className={cn('site-main', className)}
        >
          {children}
        </main>
      </div>
    </>
  )
}

export default Shell
