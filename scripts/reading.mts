import { readFile } from 'node:fs/promises'
import readingTime from 'reading-time'
import { slugFromPaperFile, updatePaperMetadata } from './papers.mts'

export default async function reading(filename: string) {
  if (!filename.includes('repo/papers')) return

  const content = await readFile(filename, 'utf8')
  return updatePaperMetadata(slugFromPaperFile(filename), (meta) => ({
    ...meta,
    minutes: readingTime(content).minutes,
  }))
}
