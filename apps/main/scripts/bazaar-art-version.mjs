import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/* one token per art state; next.config.ts inlines it for artSrc and
   postcss.config.mjs stamps it on the CSS url() refs.
   cwd probing over import.meta.url: turbopack rewrites module URLs */
export const bazaarArtVersion = () => {
  const root = [
    join(process.cwd(), 'public/images/bazaar'),
    join(process.cwd(), 'apps/main/public/images/bazaar'),
  ].find(existsSync)
  if (!root) throw new Error('public/images/bazaar not found from cwd')
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
  const hash = createHash('sha1')
  for (const file of files) {
    hash.update(relative(root, file))
    hash.update(readFileSync(file))
  }
  return hash.digest('hex').slice(0, 8)
}
