import fs from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const readFile = promisify(fs.readFile)
const readdir = promisify(fs.readdir)
const root = join(process.cwd(), 'pages/papers')

export type Paper = {
  createdAt: string
  excerpt: string
  minutes: number
  og: string
  slug: string
  title: string
  updatedAt: string
  images: {
    [key: string]: {
      width: number
      height: number
    }
  }
}

export async function fetchPapers() {
  const slugs = (await readdir(root, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .reverse()
  const papers = await Promise.all(
    slugs.map(async (slug) => {
      const meta = await readFile(join(root, slug, 'metadata.json'), 'utf8')
      return JSON.parse(meta) as Paper
    }),
  )

  return papers
}
