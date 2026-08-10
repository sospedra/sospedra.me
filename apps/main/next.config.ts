import { join } from 'node:path'
import createMDX from '@next/mdx'
import type { NextConfig } from 'next'
import { bazaarArtVersion } from './scripts/bazaar-art-version.mjs'
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
      // bare fences must still emit .line spans: the code gutter padding lives on them
      [
        '@shikijs/rehype',
        { theme: 'material-theme-darker', defaultLanguage: 'text' },
      ],
    ],
  },
})

const config: NextConfig = {
  outputFileTracingRoot: join(__dirname, '../..'),
  env: {
    NEXT_PUBLIC_BAZAAR_ART_V: bazaarArtVersion(),
  },
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
  pageExtensions: ['ts', 'tsx'],
  logging: {
    browserToTerminal: true,
  },
  experimental: {
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
  // /fonts files carry no build hash; immutable matches the old /_next/static behavior
  headers: async () => [
    {
      source: '/fonts/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    // fallback for unversioned stragglers (console file listing); art
    // replaces bytes under stable filenames, so a month bounds staleness
    {
      source: '/images/bazaar/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value:
            'public, max-age=2592000, stale-while-revalidate=31536000, immutable',
        },
      ],
    },
    // a ?v= content hash pins the exact bytes; the last match wins
    {
      source: '/images/bazaar/:path*',
      has: [{ type: 'query', key: 'v' }],
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    // hover/touch prefetch must survive the navigation; a month bounds staleness
    {
      source: '/talks/sfx/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=2592000, stale-while-revalidate=31536000',
        },
      ],
    },
  ],
}

export default withMDX(config)
