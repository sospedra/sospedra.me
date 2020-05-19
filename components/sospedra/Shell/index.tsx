import React from 'react'
import cn from 'classnames'
import Head from 'next/head'

const Shell: React.FC<{
  title?: string
  canonical?: string
  description?: string
  image?: string
  className?: string
  shellClassName?: string
}> = ({
  title,
  className,
  canonical = '',
  description,
  children,
  shellClassName = '',
  image = '/og.png',
}) => {
  title = [title, 'Rubén Sospedra'].filter((x) => x).join(' ▼ ')

  return (
    <div
      className={cn('w-full h-full overflow-x-hidden overflow-y-auto', {
        [shellClassName]: !!shellClassName,
      })}
    >
      <Head>
        <title>{title}</title>
        <meta property='og:image' content={image} />
        <meta property='og:title' content={title} />
        <link rel='canonical' href={`https://sospedra.me${canonical}`} />
        {description && (
          <>
            <meta property='og:description' content={description} />
            <meta name='description' content={description} />
          </>
        )}
      </Head>
      <main className={className}>{children}</main>
    </div>
  )
}

export default Shell
