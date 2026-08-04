import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

const BASELINE_PATH = 'scripts/css-refs-baseline.txt'
const CSS_IMPORT = /import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g
const CLASS_NAME = /\.([A-Za-z_][A-Za-z0-9_-]*)/g
const BLOCK_COMMENTS = /\/\*[\s\S]*?\*\//g

const classCache = new Map<string, Set<string>>()

const classesOf = (cssPath: string) => {
  const cached = classCache.get(cssPath)
  if (cached) return cached
  const text = existsSync(cssPath)
    ? readFileSync(cssPath, 'utf8').replace(BLOCK_COMMENTS, '')
    : ''
  const classes = new Set([...text.matchAll(CLASS_NAME)].map((m) => m[1]))
  classCache.set(cssPath, classes)
  return classes
}

const resolveCss = (importer: string, spec: string) =>
  spec.startsWith('.') ? normalize(join(dirname(importer), spec)) : spec

const withoutImports = (text: string) =>
  text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('import '))
    .join('\n')

const findingsFor = (file: string) => {
  const text = readFileSync(file, 'utf8')
  const body = withoutImports(text)
  return [...text.matchAll(CSS_IMPORT)].flatMap(([, alias, spec]) => {
    const cssPath = resolveCss(file, spec)
    const classes = classesOf(cssPath)
    const refs = [...body.matchAll(new RegExp(`\\b${alias}\\.(\\w+)`, 'g'))]
    const missing = refs
      .map((m) => m[1])
      .filter((name) => !classes.has(name))
      .map((name) => `${file}: ${alias}.${name} not in ${cssPath}`)
    const dynamic = body.includes(`${alias}[`)
      ? [`${file}: dynamic access ${alias}[...] needs manual audit`]
      : []
    return [...missing, ...dynamic]
  })
}

const tracked = execFileSync(
  'git',
  [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
    'app',
    'services',
    'repo',
  ],
  { encoding: 'utf8', maxBuffer: 1 << 28 },
)
  .split('\0')
  .filter((path) => path.endsWith('.ts') || path.endsWith('.tsx'))
  .filter((path) => existsSync(path))

const findings = [...new Set(tracked.flatMap(findingsFor))].toSorted()

if (process.argv.includes('--update-baseline')) {
  writeFileSync(BASELINE_PATH, `${findings.join('\n')}\n`)
  console.log(
    `css-refs-gate: baseline updated with ${findings.length} findings`,
  )
  process.exit(0)
}

const baseline = existsSync(BASELINE_PATH)
  ? new Set(readFileSync(BASELINE_PATH, 'utf8').split('\n').filter(Boolean))
  : new Set<string>()
const fresh = findings.filter((finding) => !baseline.has(finding))
const resolved = [...baseline].filter((line) => !findings.includes(line))

for (const finding of fresh) console.error(finding)
if (fresh.length > 0) {
  console.error(`css-refs-gate: ${fresh.length} new findings over the baseline`)
  process.exit(1)
}
const note =
  resolved.length > 0 ? `, ${resolved.length} baseline lines resolved` : ''
console.log(
  `css-refs-gate: no new findings (${findings.length} baselined${note})`,
)
