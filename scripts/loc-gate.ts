import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const CAP = Number(process.env.LOC_MAX ?? 300)
const JS_EXTENSIONS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts'])
const CSS_EXTENSIONS = new Set(['css'])
const HASH_EXTENSIONS = new Set(['sh', 'fish', 'py'])
const BLOCK_COMMENTS = /\/\*[\s\S]*?\*\//g

const extensionOf = (path: string) => path.split('.').at(-1) ?? ''

const isCode = (path: string) => {
  const extension = extensionOf(path)
  return (
    JS_EXTENSIONS.has(extension) ||
    CSS_EXTENSIONS.has(extension) ||
    HASH_EXTENSIONS.has(extension)
  )
}

const isLineComment = (line: string, extension: string) => {
  if (JS_EXTENSIONS.has(extension)) return line.startsWith('//')
  if (HASH_EXTENSIONS.has(extension)) return line.startsWith('#')
  return false
}

const effectiveLoc = (path: string) => {
  const extension = extensionOf(path)
  const raw = readFileSync(path, 'utf8')
  const text = HASH_EXTENSIONS.has(extension)
    ? raw
    : raw.replace(BLOCK_COMMENTS, '')
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isLineComment(line, extension)).length
}

const tracked = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8', maxBuffer: 1 << 28 },
)
  .split('\0')
  .filter(Boolean)
  .filter((path) => !path.startsWith('docs/'))
  .filter(isCode)
  .filter((path) => existsSync(path))

const offenders = tracked
  .map((path) => ({ path, loc: effectiveLoc(path) }))
  .filter((file) => file.loc > CAP)
  .toSorted((a, b) => b.loc - a.loc)

for (const { path, loc } of offenders) {
  console.error(`${String(loc).padStart(5)}  ${path}`)
}
if (offenders.length > 0) {
  console.error(`loc-gate: ${offenders.length} files over ${CAP} effective LOC`)
  process.exit(1)
}
console.log(`loc-gate: every code file is at or under ${CAP} effective LOC`)
