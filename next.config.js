const optimizedImages = require('next-optimized-images')

module.exports = optimizedImages({
  optimizeImagesInDev: true,
  webpack: (config, { dev }) => {
    config.node = { fs: 'empty' }
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    })
    return config
  },
})
