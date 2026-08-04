import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { LocalizedText } from '../../app/meridian/model.ts'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
export const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '../..')
export const PUBLIC_ROOT = join(REPOSITORY_ROOT, 'public')

export const errors: string[] = []

export const check = (condition: unknown, message: string): void => {
  if (!condition) errors.push(message)
}

export const sha256 = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex')

export const normalizedLabel = (value: string): string =>
  value.normalize('NFC').trim().toLocaleLowerCase('en')

export const isLocalizedText = (value: LocalizedText | undefined): boolean =>
  typeof value?.en === 'string' &&
  value.en.trim().length > 0 &&
  typeof value.es === 'string' &&
  value.es.trim().length > 0
