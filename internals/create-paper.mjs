import { existsSync } from 'node:fs'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { writeJson } from './io.mjs'
import reading from './reading.mjs'
import resize from './resize.mjs'

try {
  const paper = process.argv[2]
  if (!paper) {
    throw Error(`No 'paper' is provided. Try 'pnpm cmd:create-paper {name}'`)
  }

  const dir = join(process.cwd(), 'content/papers', paper)
  const now = new Date().toISOString()
  const meta = {
    createdAt: now,
    excerpt: '',
    og: '',
    slug: paper,
    title: '',
    updatedAt: now,
    images: {},
    minutes: 0,
    categories: [],
  }

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.mdx'), '')
  }
  await writeJson(join(dir, 'metadata.json'), meta)

  for (const file of await readdir(dir)) {
    const path = join(dir, file)
    if (/\.(gif|jpg|jpeg|tiff|png)$/i.test(file)) await resize(path)
    if (file.endsWith('.mdx')) await reading(path)
  }
} catch (ex) {
  console.log(`\n🚨  ${ex.message}\n`)
}
