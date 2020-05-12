const optimizedImages = require('next-optimized-images')

module.exports = optimizedImages({
  optimizeImagesInDev: true,
  webpack: (config) => {
    config.node = { fs: 'empty' }
    return config
  },
})
