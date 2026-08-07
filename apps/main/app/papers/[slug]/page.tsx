import type { MDXComponents } from 'mdx/types'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Aside from 'services/markdown/aside'
import CodeBlock from 'services/markdown/code'
import GlitchRoll from 'services/markdown/glitch-roll'
import PaperImage from 'services/markdown/image'
import {
  fetchPaper,
  fetchPapers,
} from 'services/markdown/paper.server-snapshot'
import type { Paper } from 'services/markdown/paper.types'
import PaperShell from 'services/markdown/paper-shell'
import Pull from 'services/markdown/pull'
import PaperKeys from './paper-keys'

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

  return {
    title: meta.title,
    description: meta.excerpt,
    keywords: meta.categories,
    alternates: { canonical: `/papers/${meta.slug}` },
    openGraph: { images: [meta.og] },
  }
}

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

const paperNeighbors = (papers: Paper[], slug: string) => {
  const index = papers.findIndex((paper) => paper.slug === slug)
  if (index === -1) return { newer: undefined, older: undefined }
  return { newer: papers[index - 1]?.slug, older: papers[index + 1]?.slug }
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
    <PaperShell {...meta}>
      <PaperKeys newer={newer} older={older} />
      <GlitchRoll />
      <Post components={createMdxComponents(meta)} />
    </PaperShell>
  )
}
