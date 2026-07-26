import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const BUNDLED_EXTENSIONS = new Set(['tsx', 'ts', 'js', 'lock', 'css'])

const filterStatic = (name: string) => {
  if (name.startsWith('.')) return false
  const extension = name.split('.').at(-1) ?? ''
  return name.includes('.') && !BUNDLED_EXTENSIONS.has(extension.toLowerCase())
}

// build-time only: next.config.ts snapshots the result into static-files.json
export const listStaticFiles = (dir: string): string[] => {
  const dirents = readdirSync(dir, { withFileTypes: true })
    .filter((dirent) => filterStatic(dirent.name) || dirent.isDirectory())
    .toSorted((a, b) => +b.isDirectory() - +a.isDirectory())

  return dirents.flatMap((dirent) => {
    const path = join(dir, dirent.name)
    return dirent.isDirectory() ? listStaticFiles(path) : `/${path}`
  })
}
