const resize = require('./resize')
const createScript = require('./create-script')

createScript('resize', (file) => {
  if (file.match(/[\/.](gif|jpg|jpeg|tiff|png)$/i)) {
    resize(file)
  }
})()
