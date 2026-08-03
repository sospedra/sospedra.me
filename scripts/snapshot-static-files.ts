import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const ROOT = 'public'
const BUNDLED_EXTENSIONS = new Set(['tsx', 'ts', 'js', 'lock', 'css'])

const isServed = (path: string) => {
  const name = path.split('/').at(-1) ?? ''
  if (name.startsWith('.')) return false
  const extension = name.split('.').at(-1) ?? ''
  return name.includes('.') && !BUNDLED_EXTENSIONS.has(extension.toLowerCase())
}

/* git, not the filesystem: only committed files reach a deployment, and
   public/ collects gitignored scratch on a working machine */
const tracked = execFileSync('git', ['ls-files', '-z', ROOT], {
  encoding: 'utf8',
  maxBuffer: 1 << 28,
})
  .split('\0')
  .filter(isServed)
  .map((path) => path.slice(ROOT.length))

/* /console renders from this snapshot: tracing public/** into its
   revalidation function blew Vercel's 250mb limit (public is 533mb) */
writeFileSync(
  './app/console/static-files.json',
  `${JSON.stringify(tracked, null, 2)}\n`,
)
