import NextImage from 'next/image'
import type React from 'react'
import type { Paper } from '../files'

const Image: React.FC<{
  alt: string
  meta: Paper
  src: string
}> = (props) => {
  const { width, height } = props.meta.images[props.src]

  return (
    <NextImage
      alt={props.alt}
      title={props.alt}
      className='max-w-full h-auto'
      src={`/papers/${props.meta.slug}/${props.src}`}
      width={width}
      height={height}
    />
  )
}

export default Image
