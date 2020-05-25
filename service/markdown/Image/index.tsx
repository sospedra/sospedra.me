import React from 'react'
import Head from 'next/head'
import { Paper } from '../files'

const Image: React.FC<{
  alt: string
  meta: Paper
  src: string
}> = (props) => {
  const { width, height } = props.meta.images[props.src]
  const src = `${props.meta.slug}/${props.src}`
  const { alt } = props

  return (
    <span
      className='relative block max-w-full'
      style={{
        width,
        backgroundColor: require(`pages/papers/${src}?lqip-colors`)[0],
      }}
    >
      <Head>
        <link
          as='image'
          href={require(`pages/papers/${src}?webp`)}
          rel='preload'
          type='image/webp'
        />
      </Head>
      <span
        className='block w-full h-full'
        style={{ paddingTop: `${(height / width) * 100}%` }}
      />
      <picture>
        <source
          srcSet={require(`pages/papers/${src}?webp`)}
          type='image/webp'
        />
        <source srcSet={require(`pages/papers/${src}`)} type='image/jpeg' />
        <img
          alt={alt}
          className='absolute inset-0 w-full h-full max-w-full max-h-full'
          height={height}
          loading='lazy'
          src={require(`pages/papers/${src}`)}
          title={alt}
          width={width}
        />
      </picture>
    </span>
  )
}

export default Image
