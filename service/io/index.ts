import { readdirSync } from 'node:fs'
import { join } from 'node:path'

export * from './paths-to-tree'

const filterStatic = (name: string) => {
  return /^.*\.(?!tsx$|ts$|js$|lock|css$)[^.]+$/i.test(name)
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
