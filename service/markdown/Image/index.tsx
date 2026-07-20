import NextImage from 'next/image'
import type React from 'react'
import type { Paper } from '../files'
import css from './image.module.css'

const Image: React.FC<{
  alt: string
  meta: Paper
  src: string
}> = (props) => {
  const { width, height } = props.meta.images[props.src]
  const captionId = `paper-image-${props.meta.slug}-${props.src}`.replace(
    /[^a-zA-Z0-9-_]/g,
    '-',
  )

  return (
    // biome-ignore lint/a11y/useSemanticElements: Markdown images are emitted inside paragraphs, where figure and fieldset are invalid children.
    <span
      aria-labelledby={captionId}
      className={css.figure}
      data-paper-media='true'
      role='group'
    >
      <span className={css.viewport}>
        <NextImage
          alt={props.alt}
          className={css.image}
          decoding='async'
          height={height}
          sizes='(min-width: 960px) 56rem, calc(100vw - 2rem)'
          src={`/papers/${props.meta.slug}/${props.src}`}
          width={width}
        />
      </span>
      <span className={css.caption} id={captionId}>
        <span className={css.label}>{'VISUAL // ARCHIVE'}</span>
        <span>{props.alt}</span>
        <span className={css.dimensions}>
          {width}×{height}px
        </span>
      </span>
    </span>
  )
}

export default Image
