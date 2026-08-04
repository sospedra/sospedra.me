import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'

export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex')
export const round = (value) => Number(value.toFixed(2))

export const ensureDirectory = (path) => mkdirSync(path, { recursive: true })

export const writeFileAtomically = (path, bytes) => {
  const temporaryPath = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(temporaryPath, bytes)
    renameSync(temporaryPath, path)
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath)
  }
}

export const stableJson = (value) =>
  `${JSON.stringify(value, null, 2).replace(
    /\[\n((?:\s+(?:"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null),?\n)+)\s*\]/gu,
    (_, lines) =>
      `[${lines
        .trim()
        .split(/\n/u)
        .map((line) => line.trim())
        .join(' ')}]`,
  )}\n`

export const assertSafeSvg = (source, label) => {
  const unsafe =
    /<script\b|javascript:|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']https?:/iu
  if (unsafe.test(source)) {
    throw new Error(`Unsafe SVG content rejected: ${label}`)
  }
}
