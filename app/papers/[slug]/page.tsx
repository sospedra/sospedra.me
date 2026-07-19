import type { Metadata } from 'next'
import type { MDXComponents } from 'mdx/types'
import { fetchPaper, fetchPapers, Paper } from 'service/markdown/files'
import PaperShell from 'service/markdown/Paper'
import PaperImage from 'service/markdown/Image'

export const dynamicParams = false

export async function generateStaticParams() {
  const papers = await fetchPapers()
  return papers.map(({ slug }) => ({ slug }))
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await props.params
  const meta = await fetchPaper(slug)

  return {
    title: meta.title,
    description: meta.excerpt,
    keywords: meta.categories,
    alternates: { canonical: `/papers/${meta.slug}` },
    openGraph: { images: [meta.og] },
  }
}

// metadata flows by closure: the img override needs this paper's dimensions
const createMdxComponents = (meta: Paper): MDXComponents => ({
  img: (props) => {
    const src = props.src ?? ''
    if (src.includes('.jpeg')) {
      return <PaperImage src={src} alt={props.alt ?? ''} meta={meta} />
    }
    return <img src={src} alt={props.alt} />
  },
})

export default async function PaperPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const meta = await fetchPaper(slug)
  const { default: Post } = await import(`content/papers/${slug}/index.mdx`)

  return (
    <PaperShell {...meta}>
      <Post components={createMdxComponents(meta)} />
    </PaperShell>
  )
}
