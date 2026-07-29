/**
 * One-shot: move every blob from the legacy prefix to boombox/.
 * Server-side copy (no download), verify counts, then delete the originals.
 *
 *   node --env-file=.env.local scripts/boombox/rename-blob-prefix.mjs
 */
import { copy, del, list } from '@vercel/blob'

const OLD_PREFIX = 'bubordle/'
const NEW_PREFIX = 'boombox/'
const BATCH = 16

const listAll = async (prefix) => {
  const blobs = []
  let cursor
  do {
    const page = await list({ prefix, cursor, limit: 1000 })
    blobs.push(...page.blobs)
    cursor = page.cursor
  } while (cursor)
  return blobs
}

const chunked = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )

const originals = await listAll(OLD_PREFIX)
console.log(`found ${originals.length} blobs under ${OLD_PREFIX}`)
if (originals.length === 0) process.exit(0)

let done = 0
for (const batch of chunked(originals, BATCH)) {
  await Promise.all(
    batch.map((blob) =>
      copy(blob.url, blob.pathname.replace(OLD_PREFIX, NEW_PREFIX), {
        access: 'public',
      }),
    ),
  )
  done += batch.length
  if (done % 160 === 0 || done === originals.length) {
    console.log(`copied ${done}/${originals.length}`)
  }
}

const copies = await listAll(NEW_PREFIX)
console.log(`verify: ${copies.length} blobs under ${NEW_PREFIX}`)
if (copies.length < originals.length) {
  console.error('copy incomplete; originals kept')
  process.exit(1)
}

for (const batch of chunked(originals, 100)) {
  await del(batch.map((blob) => blob.url))
}
const leftovers = await listAll(OLD_PREFIX)
console.log(`deleted originals; ${leftovers.length} left under ${OLD_PREFIX}`)
