import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const abs = (pathname) => join(process.cwd(), pathname)

export const readJson = async (filename, fallback) => {
  if (!existsSync(filename)) return fallback
  return JSON.parse(await readFile(filename, 'utf8'))
}

export const writeJson = (filename, data) => {
  return writeFile(filename, `${JSON.stringify(data, null, 2)}\n`)
}

export const patch = (data, key, value) => ({
  ...data,
  [key]: typeof value === 'object' ? { ...(data[key] || {}), ...value } : value,
})
