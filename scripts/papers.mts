import { readdir } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { abs, readJson, writeJson } from './io.mts'

export type Metadata = {
  createdAt: string
  excerpt: string
  og: string
  slug: string
  title: string
  updatedAt: string
  images: Record<string, { width?: number; height?: number }>
  minutes: number
  categories: string[]
}

const IMAGE_RE = /\.(gif|jpg|jpeg|tiff|png)$/i

export const isImage = (file: string) => IMAGE_RE.test(file)

export const isMdx = (file: string) => file.endsWith('.mdx')

export const paperDir = (slug: string) => abs(join('repo/papers', slug))

export const slugFromPaperFile = (filename: string) =>
  basename(dirname(filename))

export const updatePaperMetadata = async (
  slug: string,
  patch: (meta: Partial<Metadata>) => Partial<Metadata>,
) => {
  const metafile = join(paperDir(slug), 'metadata.json')
  const meta = await readJson<Partial<Metadata>>(metafile, {})
  return writeJson(metafile, patch(meta))
}

export const defaultMetadata = (slug: string): Metadata => {
  const now = new Date().toISOString()
  return {
    createdAt: now,
    excerpt: '',
    og: '',
    slug,
    title: '',
    updatedAt: now,
    images: {},
    minutes: 0,
    categories: [],
  }
}

export const listPapers = async () => {
  const entries = await readdir(abs('repo/papers'), { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

export const transformPaper = async (
  slug: string,
  match: (file: string) => boolean,
  apply: (file: string) => Promise<unknown>,
) => {
  const dir = paperDir(slug)
  const files = (await readdir(dir)).filter(match)
  for (const file of files) {
    await apply(join(dir, file))
  }
  return files.length
}
