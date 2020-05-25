const readingTime = require('reading-time')
const { resolve } = require('path')
const io = require('./io')

module.exports = async (filename) => {
  if (!filename.includes('pages/papers')) return

  const metafile = resolve(filename, '../metadata.json')
  const [content, meta] = await Promise.all([
    io.read(filename, ''),
    io.read(metafile, '{}'),
  ])

  return await io.write(
    metafile,
    io.assign(meta, 'minutes', readingTime(content).minutes),
  )
}
