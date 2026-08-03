'use cache'

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cacheLife, cacheTag } from 'next/cache'
import { byNewestFirst, paperFromMetadata } from './paper.mapper.ts'
import type { Paper } from './paper.types.ts'

const root = join(process.cwd(), 'repo/papers')

// a missing paper must resolve null: rejections inside 'use cache' abort the render
const readFileOrNull = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export async function fetchPaper(slug: string): Promise<Paper | null> {
  cacheLife('max')
  cacheTag('papers')
  const raw = await readFileOrNull(join(root, slug, 'metadata.json'))
  if (raw === null) return null
  return paperFromMetadata(slug, JSON.parse(raw))
}

export async function fetchPapers(): Promise<Paper[]> {
  cacheLife('max')
  cacheTag('papers')
  const slugs = (await readdir(root, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
  const papers = await Promise.all(
    slugs.map(async (slug) => {
      const raw = await readFile(join(root, slug, 'metadata.json'), 'utf8')
      return paperFromMetadata(slug, JSON.parse(raw))
    }),
  )
  return papers.toSorted(byNewestFirst)
}
