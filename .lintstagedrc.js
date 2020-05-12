const resize = require('./internals/resize')

module.exports = {
  '*.{ts,tsx,css}': (filenames) => `prettier --write ${filenames.join(' ')}`,
  '*.{gif,jpg,jpeg,tiff,png}': (filenames) => {
    filenames.forEach((filename) => resize(filename))
    return []
  },
}
