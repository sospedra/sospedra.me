import type { MDXComponents, MDXContent } from 'mdx/types'
import type { Metadata } from 'next'
import type React from 'react'
import Aside from 'services/markdown/aside'
import CodeBlock from 'services/markdown/code'
import GlitchRoll from 'services/markdown/glitch-roll'
import PaperImage from 'services/markdown/image'
import {
  DEFAULT_LOCALE,
  localesOf,
  paperCardPath,
  paperPath,
  type ReaderLocale,
} from 'services/markdown/paper.locales'
import { translationOf } from 'services/markdown/paper.translations'
import type { Paper } from 'services/markdown/paper.types'
import PaperShell from 'services/markdown/paper-shell'
import Pull from 'services/markdown/pull'
import { SITE_URL } from 'services/site'
import PaperKeys from './paper-keys'

const localImagePattern = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i
const protocolPattern = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

const isLocalContentImage = (src: string) =>
  localImagePattern.test(src) && !protocolPattern.test(src)

// metadata flows by closure: the img override needs this paper's dimensions
const createMdxComponents = (meta: Paper): MDXComponents => {
  return {
    img: (props) => {
      const src = props.src ?? ''
      if (isLocalContentImage(src)) {
        return <PaperImage src={src} alt={props.alt ?? ''} meta={meta} />
      }
      return <img src={src} alt={props.alt} />
    },
    pre: CodeBlock,
    Aside,
    Pull,
  }
}

const absoluteUrl = (path: string) =>
  path.startsWith('http') ? path : `${SITE_URL}${path}`

/** Swaps the head copy for the locale, so the rest of the page stays generic. */
export const localizedPaper = (meta: Paper, locale: ReaderLocale): Paper => {
  if (locale === DEFAULT_LOCALE) return meta
  const translation = translationOf(meta.slug, locale)
  if (!translation) return meta
  return {
    ...meta,
    title: translation.title,
    description: translation.description,
    excerpt: translation.excerpt,
    categories: translation.keywords,
    og: paperCardPath(meta.slug, locale),
  }
}

const languageAlternates = (slug: string) => {
  const locales = localesOf(slug)
  if (locales.length === 0) return undefined
  const translated = Object.fromEntries(
    locales.map((locale) => [locale, paperPath(slug, locale)]),
  )
  return {
    ...translated,
    en: paperPath(slug, DEFAULT_LOCALE),
    'x-default': paperPath(slug, DEFAULT_LOCALE),
  }
}

export const paperMetadata = (meta: Paper, locale: ReaderLocale): Metadata => ({
  title: meta.title,
  description: meta.description ?? meta.excerpt,
  keywords: meta.categories,
  alternates: {
    canonical: paperPath(meta.slug, locale),
    languages: languageAlternates(meta.slug),
  },
  openGraph: {
    type: 'article',
    locale,
    alternateLocale: siblingLocales(meta.slug, locale),
    url: paperPath(meta.slug, locale),
    images: [meta.og],
    publishedTime: meta.createdAt,
    modifiedTime: meta.updatedAt,
  },
})

const siblingLocales = (slug: string, locale: ReaderLocale): ReaderLocale[] => {
  const all: ReaderLocale[] = [DEFAULT_LOCALE, ...localesOf(slug)]
  return all.filter((other) => other !== locale)
}

const paperJsonLd = (meta: Paper, locale: ReaderLocale) => {
  const url = absoluteUrl(paperPath(meta.slug, locale))
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: meta.title,
    description: meta.description ?? meta.excerpt,
    url,
    mainEntityOfPage: url,
    datePublished: meta.createdAt,
    dateModified: meta.updatedAt,
    image: absoluteUrl(meta.og),
    keywords: meta.categories,
    inLanguage: locale,
    workTranslation: siblingLocales(meta.slug, locale).map((other) =>
      absoluteUrl(paperPath(meta.slug, other)),
    ),
    wordCount: Math.round(meta.minutes * 200),
    author: { '@type': 'Person', name: 'Rubén Sospedra', url: SITE_URL },
    publisher: { '@type': 'Person', name: 'Rubén Sospedra', url: SITE_URL },
  }
}

export const paperNeighbors = (papers: Paper[], slug: string) => {
  const index = papers.findIndex((paper) => paper.slug === slug)
  if (index === -1) return { newer: undefined, older: undefined }
  return { newer: papers[index - 1]?.slug, older: papers[index + 1]?.slug }
}

const PaperView: React.FC<{
  meta: Paper
  locale: ReaderLocale
  Post: MDXContent
  newer?: string
  older?: string
}> = (props) => {
  const { Post } = props

  return (
    <PaperShell {...props.meta} locale={props.locale}>
      <script
        type='application/ld+json'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static article json-ld
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(paperJsonLd(props.meta, props.locale)),
        }}
      />
      <PaperKeys newer={props.newer} older={props.older} />
      <GlitchRoll />
      <Post components={createMdxComponents(props.meta)} />
    </PaperShell>
  )
}

export default PaperView
