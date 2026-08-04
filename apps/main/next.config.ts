import { join } from 'node:path'
import createMDX from '@next/mdx'
import type { NextConfig } from 'next'
import rewrites from './services/rewrites.json'

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
  outputFileTracingRoot: join(__dirname, '../..'),
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
    '/crosswords': ['./repo/crosswords/challenges/**'],
    '/meridian': ['./repo/geo/challenges/**'],
    '/papers': ['./repo/papers/**'],
    '/papers/[slug]': ['./repo/papers/**'],
    '/rss.xml': ['./repo/papers/**'],
    '/sitemap.xml': ['./repo/papers/**'],
  },
  redirects: async () => [
    // the stack screen is gone but inbound links survive
    { source: '/stack', destination: '/bazaar', permanent: true },
    // the talks screen became the videoclub; /talks/* assets stay untouched
    { source: '/talks', destination: '/videoclub', permanent: true },
    // the Minesweeper arcade grew into a Windows 98 desktop
    { source: '/g-mines', destination: '/w98', permanent: true },
    // the serve archive listing became the console terminal
    { source: '/serve', destination: '/console', permanent: true },
    // Meridian owns one stable public URL; locale and practice live in-app
    {
      source: '/games/geo',
      destination: '/meridian',
      permanent: false,
    },
    {
      source: '/:locale(en|es)/games/geo/:path*',
      destination: '/meridian',
      permanent: false,
    },
    ...rewrites.map(({ source, destination }) => ({
      source,
      destination,
      permanent: true,
    })),
  ],
}

export default withMDX(config)
