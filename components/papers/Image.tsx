import React, { useState } from 'react'
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
  const [didLoad, setDidLoad] = useState(false)

  return (
    <div className='relative' style={props.meta[props.src]}>
      <Head>
        <link
          rel='preload'
          as='image'
          href={require(`_papers/${props.slug}/${props.src}?webp`)}
          type='image/webp'
        />
      </Head>
      <img
        src={require(`_papers/${props.slug}/${props.src}?lqip`)}
        alt={props.alt}
        className='absolute w-full h-full'
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
          onLoad={() => setDidLoad(true)}
          src={require(`_papers/${props.slug}/${props.src}`)}
          alt={props.alt}
          title={props.title}
          className={cn('absolute w-full h-full', {
            'opacity-0': !didLoad,
          })}
          loading='lazy'
        />
      </picture>
    </div>
  )
}

export default Image
