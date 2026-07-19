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
  pageExtensions: ['ts', 'tsx'],
  redirects: async () =>
    rewrites.map(({ source, destination }) => ({
      source,
      destination,
      permanent: true,
    })),
}

export default withMDX(config)
