import React from 'react'
import cn from 'classnames'
import Head from 'next/head'

const Shell: React.FC<{
  canonical?: string
  className?: string
  description?: string
  image?: string
  shellClassName?: string
  title?: string
}> = ({
  canonical = '',
  children,
  className,
  description = '',
  image = '/sospedra.png',
  shellClassName = '',
  title = '',
}) => {
  title = [title, 'Rubén Sospedra'].join(' ▼ ')

  return (
    <div
      style={{ overscrollBehavior: 'contain' }}
      className={cn('w-full h-full overflow-x-hidden overflow-y-auto', {
        [shellClassName]: !!shellClassName,
      })}
    >
      <Head>
        <title>{title}</title>
        <meta name='description' content={description} />
        <meta name='image' content={image} />
        <meta property='og:image' content={image} />
        <meta property='og:description' content={description} />
        <meta property='og:title' content={title} />
        <meta name='twitter:image' content={image} />
        <meta name='twitter:title' content={title} />
        <meta name='twitter:description' content={description} />
        <link rel='canonical' href={`https://sospedra.me${canonical}`} />
      </Head>
      <main className={className}>{children}</main>
    </div>
  )
}

export default Shell
