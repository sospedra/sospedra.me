const sharp = require('sharp')
const { resolve, dirname, basename } = require('path')
const io = require('./io')

sharp.cache(false)

module.exports = async (filename) => {
  if (!filename.includes('content/papers')) return

  const image = sharp(filename)
  const { width } = await image.metadata()
  const resized = width > 640 ? image.resize(640) : image
  const data = await resized.jpeg().toBuffer()

  // sources and metadata live in content, served files in public
  const output = filename
    .replace('content/papers', 'public/papers')
    .replace(/\.[^.]+$/, '.jpeg')

  if (!(await io.exists(dirname(output)))) {
    await io.mkdir(dirname(output))
  }
  await io.write(output, data, false)

  const dimensions = await sharp(output).metadata()
  const metafile = resolve(filename, '../metadata.json')
  const meta = await io.read(metafile, '{}')

  return io.write(
    metafile,
    io.assign(meta, 'images', {
      [basename(output)]: {
        width: dimensions.width,
        height: dimensions.height,
      },
    }),
  )
}
