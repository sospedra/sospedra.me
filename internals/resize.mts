import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import sharp from 'sharp'
import { readJson, writeJson } from './io.mts'
import type { Metadata } from './papers.mts'

sharp.cache(false)

const EXTENSION_RE = /\.[^.]+$/

export default async function resize(filename: string) {
  if (!filename.includes('content/papers')) return

  const image = sharp(filename)
  const { width } = await image.metadata()
  const resized = width > 640 ? image.resize(640) : image
  const data = await resized.jpeg().toBuffer()

  // sources and metadata live in content, served files in public
  const output = filename
    .replace('content/papers', 'public/papers')
    .replace(EXTENSION_RE, '.jpeg')

  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, data)

  const dimensions = await sharp(output).metadata()
  const metafile = resolve(filename, '../metadata.json')
  const meta = await readJson<Partial<Metadata>>(metafile, {})

  return writeJson(metafile, {
    ...meta,
    images: {
      ...meta.images,
      [basename(output)]: {
        width: dimensions.width,
        height: dimensions.height,
      },
    },
  })
}
