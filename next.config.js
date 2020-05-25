const optimizedImages = require('next-optimized-images')
const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      require('remark-abbr'),
      require('remark-autolink-headings'),
      require('remark-breaks'),
      require('remark-external-links'),
      require('remark-slug'),
      require('remark-squeeze-paragraphs'),
    ],
    rehypePlugins: [
      [
        require('rehype-shiki'),
        { theme: 'Material-Theme-Darker-High-Contrast' },
      ],
    ],
  },
})

const config = {
  optimizeImagesInDev: true,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  webpack: (config, { dev }) => {
    config.node = { fs: 'empty' }
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    })
    return config
  },
}

module.exports = withMDX(optimizedImages(config))
