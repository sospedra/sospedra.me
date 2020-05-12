import React from 'react'
import cn from 'classnames'
import { Post } from 'service/api'
import Head from 'next/head'

const Image: React.FC<{
  alt: string
  meta: Post['metadata']
  slug: Post['slug']
  src: string
  title: string
}> = (props) => {
  const size = props.meta[props.src]

  return (
    <span
      className='relative block'
      style={{
        ...size,
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
          className={cn('w-full h-full')}
          {...size}
        />
      </picture>
    </span>
  )
}

export default Image
