const { promisify } = require('util')
const { join } = require('path')
const fs = require('fs')
const resize = require('./resize')

const root = join(process.cwd(), '_papers')
const readdir = promisify(fs.readdir)

;(async function resizeDir() {
  try {
    const paper = process.argv[2]

    if (!paper) {
      throw Error('No `paper` is provided. Try `yarn resizedir hello-world`')
    }

    for (file of await readdir(join(root, paper))) {
      if (file.match(/[\/.](gif|jpg|jpeg|tiff|png)$/i)) {
        resize(join(root, paper, file))
      }
    }
  } catch (ex) {
    console.log(`\n🚨  ${ex.message}\n`)
  }
})()
