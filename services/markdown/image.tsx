import NextImage from 'next/image'
import type React from 'react'
import { hashString } from 'services/random'
import css from './image.module.css'
import type { Paper } from './paper.types'

// markdown emits './name.png' srcs; manifest keys and public URLs drop the prefix
const RELATIVE_PREFIX = /^\.\/+/

const stripRelativePrefix = (src: string) => src.replace(RELATIVE_PREFIX, '')

const getExtension = (filename: string) => {
  const dot = filename.lastIndexOf('.')
  if (dot === -1) return undefined
  const extension = filename.slice(dot + 1)
  return extension === '' ? undefined : extension.toUpperCase()
}

const parseImageSource = (src: string) => {
  const cleanSrc = stripRelativePrefix(src.split('?', 1)[0].split('#', 1)[0])
  const filename = cleanSrc.split('/').at(-1) ?? cleanSrc
  return { cleanSrc, filename, extension: getExtension(filename) }
}

const Image: React.FC<{
  alt: string
  meta: Paper
  src: string
}> = (props) => {
  const { cleanSrc, filename, extension } = parseImageSource(props.src)
  const dimensions =
    props.meta.images[props.src] ??
    props.meta.images[cleanSrc] ??
    props.meta.images[filename]
  const source = props.src.startsWith('/')
    ? props.src
    : `/papers/${props.meta.slug}/${stripRelativePrefix(props.src)}`
  const captionId = `paper-image-${props.meta.slug}-${hashString(props.src).toString(36)}`
  const firstImage = Object.keys(props.meta.images)[0]
  // manifest key order decides the LCP image: the first key loads eagerly
  const isFirstImage =
    firstImage !== undefined &&
    [props.src, cleanSrc, filename].includes(firstImage)

  return (
    // biome-ignore lint/a11y/useSemanticElements: Markdown images are emitted inside paragraphs, where figure and fieldset are invalid children.
    <span
      aria-labelledby={captionId}
      className={css.figure}
      data-paper-media='true'
      role='group'
    >
      <span className={css.viewport}>
        {dimensions ? (
          <NextImage
            alt={props.alt}
            className={css.image}
            decoding='async'
            height={dimensions.height}
            loading={isFirstImage ? 'eager' : 'lazy'}
            sizes='(min-width: 672px) 40rem, calc(100vw - 2rem)'
            src={source}
            unoptimized={extension === 'GIF'}
            width={dimensions.width}
          />
        ) : (
          <img
            alt={props.alt}
            className={css.image}
            decoding='async'
            loading='lazy'
            src={source}
          />
        )}
      </span>
      <span className={css.caption} id={captionId}>
        <span className={css.label}>{'VISUAL // ARCHIVE'}</span>
        <span>{props.alt}</span>
        <span className={css.dimensions}>
          {dimensions
            ? `${dimensions.width}×${dimensions.height}px`
            : (extension ?? 'MEDIA')}
        </span>
      </span>
    </span>
  )
}

export default Image
