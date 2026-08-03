export type Resolved = { kind: 'dir' | 'file'; segments: string[] }

export const joinPath = (segments: string[]) =>
  segments.length ? `/${segments.join('/')}` : '/'

export const entriesAt = (paths: string[], dir: string[]) => {
  const prefix = dir.length ? `${joinPath(dir)}/` : '/'
  const dirs = new Set<string>()
  const files = new Set<string>()

  for (const path of paths) {
    if (!path.startsWith(prefix)) continue
    const [head = '', ...tail] = path.slice(prefix.length).split('/')
    const bucket = tail.length ? dirs : files
    bucket.add(head)
  }

  return { dirs: [...dirs].sort(), files: [...files].sort() }
}

export const findCaseless = (names: string[], query: string) =>
  names.find((name) => name.toLowerCase() === query.toLowerCase())

export const resolvePath = (
  paths: string[],
  cwd: string[],
  arg: string,
): Resolved | null => {
  const parts = arg.split('/').filter((part) => part && part !== '.')
  const segments = arg.startsWith('/') ? [] : [...cwd]

  for (const [index, part] of parts.entries()) {
    if (part === '..') {
      segments.pop()
      continue
    }
    const { dirs, files } = entriesAt(paths, segments)
    const dir = findCaseless(dirs, part)
    if (dir) {
      segments.push(dir)
      continue
    }
    const isLastPart = index === parts.length - 1
    const file = isLastPart ? findCaseless(files, part) : undefined
    if (!file) return null
    return { kind: 'file', segments: [...segments, file] }
  }

  return { kind: 'dir', segments }
}
