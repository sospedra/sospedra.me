import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import readingTime from 'reading-time'
import { readJson, writeJson } from './io.mts'
import type { Metadata } from './papers.mts'

export default async function reading(filename: string) {
  if (!filename.includes('content/papers')) return

  const metafile = resolve(filename, '../metadata.json')
  const [content, meta] = await Promise.all([
    readFile(filename, 'utf8'),
    readJson<Partial<Metadata>>(metafile, {}),
  ])

  return writeJson(metafile, {
    ...meta,
    minutes: readingTime(content).minutes,
  })
}
