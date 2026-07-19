import React from 'react'
import { GetStaticPaths, GetStaticProps } from 'next'
import type { MDXComponents } from 'mdx/types'
import BrowserLifecycle from 'content/papers/browser-lifecycle/index.mdx'
import Gaas from 'content/papers/gaas/index.mdx'
import Scroll60FpsAnimation from 'content/papers/scroll-60fps-animation/index.mdx'
import TypescriptUnions from 'content/papers/typescript-unions/index.mdx'
import WebSafeFonts from 'content/papers/web-safe-fonts/index.mdx'
import { fetchPaper, fetchPapers, Paper } from 'service/markdown/files'
import PaperShell from 'service/markdown/Paper'
import PaperImage from 'service/markdown/Image'

// temporary pages-router bridge, replaced by app/papers/[slug]/page.tsx
const POSTS = {
  'browser-lifecycle': BrowserLifecycle,
  gaas: Gaas,
  'scroll-60fps-animation': Scroll60FpsAnimation,
  'typescript-unions': TypescriptUnions,
  'web-safe-fonts': WebSafeFonts,
} satisfies Record<string, React.ComponentType<{ components?: MDXComponents }>>

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

const PaperPage: React.FC<{ meta: Paper }> = (props) => {
  const Post = POSTS[props.meta.slug as keyof typeof POSTS]

  return (
    <PaperShell {...props.meta}>
      <Post components={createMdxComponents(props.meta)} />
    </PaperShell>
  )
}

export default PaperPage

export const getStaticPaths: GetStaticPaths = async () => {
  const papers = await fetchPapers()
  return {
    paths: papers.map(({ slug }) => ({ params: { slug } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const meta = await fetchPaper(String(params?.slug))
  return { props: { meta } }
}
