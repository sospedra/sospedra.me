const highlight = require('rehype-highlight')
const images = require('remark-images')
const emoji = require('remark-emoji')
const withCSS = require('@zeit/next-css')
const withMDX = require('@next/mdx')({
  options: {
    remarkPlugins: [images, emoji],
    hastPlugins: [highlight]
  }
})

module.exports = withCSS(withMDX({
  cssLoaderOptions: {
    url: false
  },
  pageExtensions: ['ts', 'tsx', 'mdx'],
  webpack: (config) => ({
    ...config,
    node: { fs: 'empty' },
  })
}))