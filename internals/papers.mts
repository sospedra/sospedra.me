import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { abs } from './io.mts'

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

export const paperDir = (slug: string) => abs(join('content/papers', slug))

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
  const entries = await readdir(abs('content/papers'), { withFileTypes: true })
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
