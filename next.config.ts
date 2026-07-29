import { writeFileSync } from 'node:fs'
import createMDX from '@next/mdx'
import type { NextConfig } from 'next'
import { listStaticFiles } from './service/io'
import rewrites from './service/router/rewrites.json'

// /console renders from this snapshot: tracing public/** into its
// revalidation function blew Vercel's 250mb limit (public is 533mb)
writeFileSync(
  './service/io/static-files.json',
  `${JSON.stringify(listStaticFiles('public'), null, 2)}\n`,
)

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
    '/crosswords': ['./content/crosswords/challenges/**'],
    '/meridian': ['./content/geo/challenges/**'],
    '/papers': ['./content/papers/**'],
    '/papers/[slug]': ['./content/papers/**'],
    '/rss.xml': ['./content/papers/**'],
    '/sitemap.xml': ['./content/papers/**'],
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
