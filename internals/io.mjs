import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { format } from 'prettier'

export const abs = (pathname) => join(process.cwd(), pathname)

export const readJson = async (filename, fallback) => {
  if (!existsSync(filename)) return fallback
  return JSON.parse(await readFile(filename, 'utf8'))
}

// prettier keeps the json byte-identical with the committed style
export const writeJson = async (filename, data) => {
  return writeFile(
    filename,
    await format(JSON.stringify(data), { parser: 'json' }),
  )
}

export const patch = (data, key, value) => ({
  ...data,
  [key]:
    typeof value === 'object' ? { ...(data[key] || {}), ...value } : value,
})
