import type { MDXComponents } from 'mdx/types'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CodeBlock from 'service/markdown/Code'
import { fetchPaper, fetchPapers, type Paper } from 'service/markdown/files'
import PaperImage from 'service/markdown/Image'
import PaperShell from 'service/markdown/Paper'
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
  }
}

export default async function PaperPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const meta = await fetchPaperOr404(slug)
  const { default: Post } = await import(`content/papers/${slug}/index.mdx`)
  const papers = await fetchPapers()
  const index = papers.findIndex((paper) => paper.slug === slug)

  return (
    <PaperShell {...meta}>
      <PaperKeys
        newer={papers[index - 1]?.slug}
        older={papers[index + 1]?.slug}
      />
      <Post components={createMdxComponents(meta)} />
    </PaperShell>
  )
}
