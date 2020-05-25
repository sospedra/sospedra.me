const reading = require('./reading')
const createScript = require('./create-script')

createScript('reading', (file) => {
  if (file.match(/[\/.](mdx)$/i)) {
    reading(file)
  }
})()
