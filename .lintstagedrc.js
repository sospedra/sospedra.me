const resize = require('./internals/resize')

module.exports = {
  '*.{ts,tsx,css,md}': () => 'prettier --write',
  '*.{gif,jpg,jpeg,tiff,png}': (filenames) => {
    console.log(filenames)
    return filenames.map((filename) => resize(filename))
  },
}
