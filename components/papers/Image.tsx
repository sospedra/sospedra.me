import React from 'react'
import Progressive from 'react-progressive-image'

const Image: React.FC<{
  src: string
  alt: string
  slug: string
  title: string
  mimeType: string
}> = (props) => {
  return (
    <Progressive
      src={require(`_papers/${props.slug}/${props.src}?webp`)}
      placeholder={require(`_papers/${props.slug}/${props.src}?lqip`)}
    >
      {(src: string, loading: boolean) => {
        return loading ? (
          <img src={src} alt={props.alt} />
        ) : (
          <picture>
            <source srcSet={src} type='image/webp' />
            <source
              srcSet={require(`_papers/${props.slug}/${props.src}`)}
              type='image/png'
            />
            <img
              src={require(`_papers/${props.slug}/${props.src}`)}
              alt={props.alt}
            />
          </picture>
        )
      }}
    </Progressive>
  )
}

export default Image
