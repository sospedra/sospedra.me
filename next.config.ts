import type { NextConfig } from 'next'
import createMDX from '@next/mdx'
import rewrites from './service/router/rewrites.json'

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: ['remark-gfm', 'remark-breaks'],
    rehypePlugins: [
      'rehype-slug',
      ['rehype-autolink-headings', { behavior: 'wrap' }],
      [
        'rehype-external-links',
        { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] },
      ],
      ['@shikijs/rehype', { theme: 'material-theme-darker' }],
    ],
  },
})

const config: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
  pageExtensions: ['ts', 'tsx'],
  logging: {
    browserToTerminal: true,
  },
  experimental: {
    inlineCss: true,
    webVitalsAttribution: ['CLS', 'LCP', 'INP'],
  },
  // cache revalidation re-runs fs reads at runtime, and the tracer
  // cannot follow dynamic process.cwd() paths into the function bundle
  outputFileTracingIncludes: {
    '/papers': ['./content/papers/**'],
    '/papers/[slug]': ['./content/papers/**'],
    '/rss.xml': ['./content/papers/**'],
    '/sitemap.xml': ['./content/papers/**'],
    '/serve': ['./public/**'],
  },
  redirects: async () =>
    rewrites.map(({ source, destination }) => ({
      source,
      destination,
      permanent: true,
    })),
}

export default withMDX(config)
