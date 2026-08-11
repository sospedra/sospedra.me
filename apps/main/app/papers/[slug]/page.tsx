import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DEFAULT_LOCALE } from 'services/markdown/paper.locales'
import {
  fetchPaper,
  fetchPapers,
} from 'services/markdown/paper.server-snapshot'
import PaperView, { paperMetadata, paperNeighbors } from './paper-render'

export async function generateStaticParams() {
  const papers = await fetchPapers()
  return papers.map(({ slug }) => ({ slug }))
}

// dynamicParams=false is banned under cacheComponents, guard instead
const fetchPaperOr404 = async (slug: string) => {
  const meta = await fetchPaper(slug)
  if (!meta) notFound()
  return meta
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await props.params
  const meta = await fetchPaperOr404(slug)
  return paperMetadata(meta, DEFAULT_LOCALE)
}

export default async function PaperPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const meta = await fetchPaperOr404(slug)
  const [{ default: Post }, papers] = await Promise.all([
    import(`repo/papers/${slug}/index.mdx`),
    fetchPapers(),
  ])
  const { newer, older } = paperNeighbors(papers, slug)

  return (
    <PaperView
      meta={meta}
      locale={DEFAULT_LOCALE}
      Post={Post}
      newer={newer}
      older={older}
    />
  )
}
