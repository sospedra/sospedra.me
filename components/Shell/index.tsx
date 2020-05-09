import React from 'react'
import Head from 'next/head'

const Shell: React.FC<{
  title?: string
  description?: string
  image?: string
  className?: string
}> = ({ title, className, description, children, image = '/og.png' }) => {
  return (
    <div className='w-full h-full overflow-x-hidden overflow-y-auto'>
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
