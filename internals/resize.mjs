import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import sharp from 'sharp'
import { patch, readJson, writeJson } from './io.mjs'

sharp.cache(false)

export default async function resize(filename) {
  if (!filename.includes('content/papers')) return

  const image = sharp(filename)
  const { width } = await image.metadata()
  const resized = width > 640 ? image.resize(640) : image
  const data = await resized.jpeg().toBuffer()

  // sources and metadata live in content, served files in public
  const output = filename
    .replace('content/papers', 'public/papers')
    .replace(/\.[^.]+$/, '.jpeg')

  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, data)

  const dimensions = await sharp(output).metadata()
  const metafile = resolve(filename, '../metadata.json')
  const meta = await readJson(metafile, {})

  return writeJson(
    metafile,
    patch(meta, 'images', {
      [basename(output)]: {
        width: dimensions.width,
        height: dimensions.height,
      },
    }),
  )
}
