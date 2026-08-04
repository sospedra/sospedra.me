import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as clack from '@clack/prompts'
import og from '../og.mts'
import {
  defaultMetadata,
  isImage,
  isMdx,
  isMetadata,
  paperDir,
  transformPaper,
  updatePaperMetadata,
} from '../papers.mts'
import { type Context, unwrap } from '../prompts.mts'
import reading from '../reading.mts'
import resize from '../resize.mts'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const promptSlug = async () =>
  unwrap(
    await clack.text({
      message: 'Paper slug',
      placeholder: 'my-next-paper',
      validate: (value) => {
        if (!value) return 'A slug is required'
        if (!SLUG_RE.test(value)) return 'Use kebab-case: a-z, 0-9 and dashes'
      },
    }),
  )

const promptTitle = async () =>
  unwrap(
    await clack.text({
      message: 'Title',
      placeholder: 'Leave empty to fill it later',
      defaultValue: '',
    }),
  )

// every step rewrites metadata.json: keep them sequential
const syncAssets = async (slug: string) => {
  const images = await transformPaper(slug, isImage, resize)
  const texts = await transformPaper(slug, isMdx, reading)
  const cards = await transformPaper(slug, isMetadata, og)
  return images + texts + cards
}

export default async function createPaper({ arg }: Context) {
  const slug = arg ?? (await promptSlug())
  const dir = paperDir(slug)
  const fresh = !existsSync(dir)
  const title = fresh && arg === undefined ? await promptTitle() : ''

  if (fresh) {
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.mdx'), '')
  } else {
    clack.log.info(`'${slug}' already exists, syncing it instead`)
  }

  // existing values win: syncing a paper must never reset its metadata
  await updatePaperMetadata(slug, (meta) => ({
    ...defaultMetadata(slug),
    ...meta,
    title: meta.title ?? title,
  }))

  const spin = clack.spinner()
  spin.start('Syncing assets')
  const count = await syncAssets(slug)
  spin.stop(`Synced ${count} assets`)

  return `repo/papers/${slug} is ready`
}
