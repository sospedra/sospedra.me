import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { filter, pipe, uniqBy } from 'es-toolkit/fp'

const root = resolve(process.cwd())
export const pathFromRoot = (path: string) => resolve(root, path)

export const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(pathFromRoot(path), 'utf8')) as T

export const writeJsonAtomically = (path: string, value: unknown) => {
  const outputPath = pathFromRoot(path)
  const temporaryPath = `${outputPath}.tmp-${process.pid}`
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(temporaryPath, outputPath)
}

export const fail = (message: string): never => {
  throw new Error(message)
}

export const assert: (
  condition: unknown,
  message: string,
) => asserts condition = (condition, message) => {
  if (!condition) fail(message)
}

export const compareText = (a: string, b: string) =>
  a < b ? -1 : a > b ? 1 : 0

export const normalizeName = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

export const normalizedCurrentName = (value: string) =>
  value.normalize('NFC').trim()

const usableName = (value: string) =>
  Boolean(value) && !/^https?:/iu.test(value) && normalizeName(value) !== ''

export const uniqueNames = (preferred: string, values: string[]) => {
  const normalizedPreferred = normalizedCurrentName(preferred)
  const candidates = [normalizedPreferred, ...values]
    .map(normalizedCurrentName)
    .filter(usableName)
  const remainder = pipe(
    candidates,
    uniqBy(normalizeName),
    filter((value) => value !== normalizedPreferred),
    (names) => names.toSorted(compareText),
  )
  return [normalizedPreferred, ...remainder]
}

export const validSourceName = (value: string | undefined) => {
  const name = normalizedCurrentName(value ?? '')
  return name && name !== '-99' ? name : ''
}
