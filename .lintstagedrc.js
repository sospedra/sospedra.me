const resize = require('./internals/resize')
const reading = require('./internals/reading')

module.exports = {
  '*.{ts,tsx,css}': (filenames) => `prettier --write ${filenames.join(' ')}`,
  '*.{mdx}': (filenames) => {
    filenames.forEach((filename) => reading(filename))
    return []
  },
  '*.{gif,jpg,jpeg,tiff,png}': (filenames) => {
    filenames.forEach((filename) => resize(filename))
    return []
  },
}
