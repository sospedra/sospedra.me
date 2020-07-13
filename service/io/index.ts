import { promises as fsp } from 'fs'
import { resolve } from 'path'

export * from './paths-to-tree'

const filterStatic = (name: string) => {
  return name.match(/^.*\.(?!tsx$|ts$|js$|lock|css$)[^.]+$/i)
}

const isValidDir = (dir: string) => {
  if (dir === '.') return true
  return ['components', 'pages', 'public', 'service'].some((path) => {
    return dir.includes(path)
  })
}

export const getStaticFiles = async function* (
  dir: string,
): AsyncGenerator<string> {
  if (!isValidDir(dir)) return

  const dirents = await fsp.readdir(dir, { withFileTypes: true })
  const statics = dirents
    .filter((dirent) => filterStatic(dirent.name) || dirent.isDirectory())
    .sort((a, b) => +b.isDirectory() - +a.isDirectory())

  for (const dirent of statics) {
    const res = resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      yield* getStaticFiles(res)
    } else {
      yield res.split(process.cwd()).pop() || ''
    }
  }
}
