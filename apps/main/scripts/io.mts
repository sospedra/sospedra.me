import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const packageRoot = join(import.meta.dirname, '..')

export const absolute = (pathname: string) => join(packageRoot, pathname)

export async function readJson<T>(filename: string, fallback: T) {
  if (!existsSync(filename)) return fallback
  return JSON.parse(await readFile(filename, 'utf8')) as T
}

export const writeJson = (filename: string, data: unknown) => {
  return writeFile(filename, `${JSON.stringify(data, null, 2)}\n`)
}
