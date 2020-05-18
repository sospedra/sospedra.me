import React from 'react'
import { Post } from 'service/api'
import Head from 'next/head'

const Image: React.FC<{
  alt: string
  meta: Post['metadata']
  slug: Post['slug']
  src: string
  title: string
}> = (props) => {
  const { width, height } = props.meta[props.src]

  return (
    <div
      className='relative block max-w-full'
      style={{
        width: width,
        backgroundColor: require(`_papers/${props.slug}/${props.src}?lqip-colors`)[0],
      }}
    >
      <Head>
        <link
          rel='preload'
          as='image'
          href={require(`_papers/${props.slug}/${props.src}?webp`)}
          type='image/webp'
        />
      </Head>
      <div
        className='w-full h-full'
        style={{ paddingTop: `${(height / width) * 100}%` }}
      />
      <picture>
        <source
          srcSet={require(`_papers/${props.slug}/${props.src}?webp`)}
          type='image/webp'
        />
        <source
          srcSet={require(`_papers/${props.slug}/${props.src}`)}
          type='image/jpeg'
        />
        <img
          src={require(`_papers/${props.slug}/${props.src}`)}
          alt={props.alt}
          loading='lazy'
          title={props.title}
          className='absolute inset-0 w-full h-full'
        />
      </picture>
    </div>
  )
}

export default Image
