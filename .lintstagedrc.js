const resize = require('./internals/resize')

module.exports = {
  '*.{ts,tsx,css,md}': () => 'prettier --write',
  '*.{gif,jpg,jpeg,tiff,png}': (filenames) => {
    filenames.map((filename) => resize(filename))
    return []
  },
}
