export type FileTreeFile = {
  kind: 'file'
  name: string
  path: string
}

export type FileTreeDirectory = {
  kind: 'directory'
  name: string
  path: string
  children: FileTreeNode[]
  directoryCount: number
  fileCount: number
}

export type FileTreeNode = FileTreeDirectory | FileTreeFile

type MutableDirectory = {
  name: string
  path: string
  directories: Map<string, MutableDirectory>
  files: Set<string>
}

const collator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
})

const toPath = (segments: string[]) =>
  segments.length ? `/${segments.join('/')}` : '/'

const makeDirectory = (name: string, segments: string[]): MutableDirectory => ({
  name,
  path: toPath(segments),
  directories: new Map(),
  files: new Set(),
})

const finalizeDirectory = (directory: MutableDirectory): FileTreeDirectory => {
  const directories = [...directory.directories.values()]
    .sort((left, right) => collator.compare(left.name, right.name))
    .map(finalizeDirectory)
  const files: FileTreeFile[] = [...directory.files]
    .sort((left, right) => collator.compare(left, right))
    .map((name) => ({
      kind: 'file',
      name,
      path: directory.path === '/' ? `/${name}` : `${directory.path}/${name}`,
    }))

  return {
    kind: 'directory',
    name: directory.name,
    path: directory.path,
    children: [...directories, ...files],
    directoryCount: directories.reduce(
      (count, child) => count + child.directoryCount + 1,
      0,
    ),
    fileCount:
      files.length +
      directories.reduce((count, child) => count + child.fileCount, 0),
  }
}

export const buildFileTree = (
  paths: string[],
  rootSegments: string[],
): FileTreeDirectory => {
  const root = makeDirectory(rootSegments.at(-1) ?? 'S:', rootSegments)

  for (const sourcePath of paths) {
    const segments = sourcePath.split('/').filter(Boolean)
    const belongsToRoot = rootSegments.every(
      (segment, index) => segments[index] === segment,
    )
    if (!belongsToRoot) continue

    const relative = segments.slice(rootSegments.length)
    const fileName = relative.at(-1)
    if (!fileName) continue

    let directory = root
    for (const [index, name] of relative.slice(0, -1).entries()) {
      const existing = directory.directories.get(name)
      if (existing) {
        directory = existing
        continue
      }

      const child = makeDirectory(name, [
        ...rootSegments,
        ...relative.slice(0, index + 1),
      ])
      directory.directories.set(name, child)
      directory = child
    }
    directory.files.add(fileName)
  }

  return finalizeDirectory(root)
}
