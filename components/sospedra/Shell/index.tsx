import React from 'react'
import cn from 'classnames'
import Head from 'next/head'

const Shell: React.FC<{
  title?: string
  description?: string
  image?: string
  className?: string
  shellClassName?: string
}> = ({
  title,
  className,
  description,
  children,
  shellClassName = '',
  image = '/og.png',
}) => {
  return (
    <div
      className={cn('w-full h-full overflow-x-hidden overflow-y-auto', {
        [shellClassName]: !!shellClassName,
      })}
    >
      <Head>
        <title>{[title, 'Rubén Sospedra'].filter((x) => x).join(' ~ ')}</title>
        <meta property='og:image' content={image} />
        {description && <meta name='description' content={description} />}
      </Head>
      <main className={className}>{children}</main>
    </div>
  )
}

export default Shell
