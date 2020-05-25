const sharp = require('sharp')
const { resolve, basename } = require('path')
const io = require('./io')

sharp.cache(false)

module.exports = (filename) => {
  if (!filename.includes('pages/papers')) return

  const image = sharp(filename)

  return image
    .metadata()
    .then(({ width }) => (width > 640 ? image.resize(640) : image))
    .then((data) => data.jpeg().toBuffer())
    .then(async (data) => {
      const file = filename.replace(/\.[^.]+$/, '.jpeg')

      await io.write(file, data, false)

      sharp(file)
        .metadata()
        .then(async ({ width, height }) => {
          const meta = await io.read(resolve(file, '../metadata.json'), '{}')

          await io.write(
            resolve(file, '../metadata.json'),
            io.assign(meta, 'images', {
              [basename(file)]: { width, height },
            }),
          )
        })
    })
}
