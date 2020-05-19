const sharp = require('sharp')
const { promisify } = require('util')
const path = require('path')
const fs = require('fs')

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const exists = promisify(fs.exists)

sharp.cache(false)

module.exports = (filename) => {
  if (!filename.includes('_papers')) return

  const image = sharp(filename)

  return image
    .metadata()
    .then(({ width }) => (width > 640 ? image.resize(640) : image))
    .then((data) => data.jpeg().toBuffer())
    .then(async (data) => {
      const file = filename.replace(/\.[^.]+$/, '.jpeg')

      await writeFile(file, data)

      sharp(file)
        .metadata()
        .then(async ({ width, height }) => {
          const metafile = path.resolve(file, '../metadata.json')
          const metaraw = (await exists(metafile))
            ? await readFile(metafile)
            : '{}'
          const meta = JSON.parse(metaraw)

          writeFile(
            path.resolve(file, '../metadata.json'),
            JSON.stringify({
              ...meta,
              [path.basename(file)]: { width, height },
            }),
          )
        })
    })
}
