import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  isPaperLocale,
  TRANSLATED_PAPERS,
} from 'services/markdown/paper.locales'
import {
  fetchPaper,
  fetchPapers,
} from 'services/markdown/paper.server-snapshot'
import { translationOf } from 'services/markdown/paper.translations'
import PaperView, {
  localizedPaper,
  paperMetadata,
  paperNeighbors,
} from '../paper-render'

type Params = { params: Promise<{ slug: string; lang: string }> }

export function generateStaticParams() {
  return Object.entries(TRANSLATED_PAPERS).flatMap(([slug, locales]) =>
    locales.map((lang) => ({ slug, lang })),
  )
}

// dynamicParams=false is banned under cacheComponents, guard instead
const fetchTranslationOr404 = async (slug: string, lang: string) => {
  if (!isPaperLocale(lang)) notFound()
  const [meta, translation] = await Promise.all([
    fetchPaper(slug),
    Promise.resolve(translationOf(slug, lang)),
  ])
  if (!meta || !translation) notFound()
  return { locale: lang, meta: localizedPaper(meta, lang), translation }
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { slug, lang } = await props.params
  const { meta, locale } = await fetchTranslationOr404(slug, lang)
  return paperMetadata(meta, locale)
}

export default async function TranslatedPaperPage(props: Params) {
  const { slug, lang } = await props.params
  const { meta, locale, translation } = await fetchTranslationOr404(slug, lang)
  const [{ default: Post }, papers] = await Promise.all([
    translation.load(),
    fetchPapers(),
  ])
  const { newer, older } = paperNeighbors(papers, slug)

  return (
    <PaperView
      meta={meta}
      locale={locale}
      Post={Post}
      newer={newer}
      older={older}
    />
  )
}
