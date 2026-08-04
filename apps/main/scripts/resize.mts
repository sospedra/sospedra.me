import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import sharp from 'sharp'
import { slugFromPaperFile, updatePaperMetadata } from './papers.mts'

// a warm cache would serve stale pixels when a rerun regenerates the same file
sharp.cache(false)

const EXTENSION_RE = /\.[^.]+$/
const MAX_IMAGE_WIDTH = 640

export default async function resize(filename: string) {
  if (!filename.includes('repo/papers')) return

  const image = sharp(filename)
  const { width } = await image.metadata()
  if (!width) throw Error(`${filename} has no readable width`)
  const resized =
    width > MAX_IMAGE_WIDTH ? image.resize(MAX_IMAGE_WIDTH) : image
  const data = await resized.jpeg().toBuffer()

  // sources and metadata live in content, served files in public
  const output = filename
    .replace('repo/papers', 'public/papers')
    .replace(EXTENSION_RE, '.jpeg')

  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, data)

  const dimensions = await sharp(output).metadata()
  return updatePaperMetadata(slugFromPaperFile(filename), (meta) => ({
    ...meta,
    images: {
      ...meta.images,
      [basename(output)]: {
        width: dimensions.width,
        height: dimensions.height,
      },
    },
  }))
}
