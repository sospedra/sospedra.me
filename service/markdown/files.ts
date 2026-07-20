'use cache'

import fs from 'fs'
import { join } from 'path'
import { promisify } from 'util'
import { cacheLife } from 'next/cache'

const readFile = promisify(fs.readFile)
const readdir = promisify(fs.readdir)
const root = join(process.cwd(), 'content/papers')

export type Paper = {
  createdAt: string
  excerpt: string
  minutes: number
  og: string
  slug: string
  title: string
  updatedAt: string
  categories: string[]
  images: {
    [key: string]: {
      width: number
      height: number
    }
  }
}

export async function fetchPaper(slug: string) {
  cacheLife('max')
  const metafile = join(root, slug, 'metadata.json')
  // a miss must resolve null: rejections inside 'use cache' abort the render
  if (!fs.existsSync(metafile)) return null
  const meta = await readFile(metafile, 'utf8')
  return JSON.parse(meta) as Paper
}

export async function fetchPapers() {
  cacheLife('max')
  const slugs = (await readdir(root, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
  const papers = await Promise.all(
    slugs.map(async (slug) => {
      const meta = await readFile(join(root, slug, 'metadata.json'), 'utf8')
      return JSON.parse(meta) as Paper
    }),
  )

  papers.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return papers
}
