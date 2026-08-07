import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

// tsc rewriteRelativeImportExtensions skips declaration emit, so dist d.ts keeps .ts specifiers
for (const name of readdirSync('dist')) {
  if (!name.endsWith('.d.ts')) continue
  const path = `dist/${name}`
  const source = readFileSync(path, 'utf8')
  writeFileSync(
    path,
    source.replaceAll(".ts'", ".js'").replaceAll('.ts"', '.js"'),
  )
}
