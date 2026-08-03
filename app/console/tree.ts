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

const childPath = (parentPath: string, name: string) =>
  parentPath === '/' ? `/${name}` : `${parentPath}/${name}`

const makeDirectory = (name: string, path: string): MutableDirectory => ({
  name,
  path,
  directories: new Map(),
  files: new Set(),
})

const childDirectory = (
  directory: MutableDirectory,
  name: string,
): MutableDirectory => {
  const existing = directory.directories.get(name)
  if (existing) return existing

  const child = makeDirectory(name, childPath(directory.path, name))
  directory.directories.set(name, child)
  return child
}

const insertPath = (root: MutableDirectory, segments: string[]) => {
  const fileName = segments.at(-1)
  if (!fileName) return

  let directory = root
  for (const name of segments.slice(0, -1)) {
    directory = childDirectory(directory, name)
  }
  directory.files.add(fileName)
}

const finalizeDirectory = (directory: MutableDirectory): FileTreeDirectory => {
  const directories = [...directory.directories.values()]
    .sort((left, right) => collator.compare(left.name, right.name))
    .map(finalizeDirectory)
  const files: FileTreeFile[] = [...directory.files]
    .sort((left, right) => collator.compare(left, right))
    .map((name) => ({
      kind: 'file',
      name,
      path: childPath(directory.path, name),
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
  const root = makeDirectory(rootSegments.at(-1) ?? 'S:', toPath(rootSegments))

  for (const sourcePath of paths) {
    const segments = sourcePath.split('/').filter(Boolean)
    const belongsToRoot = rootSegments.every(
      (segment, index) => segments[index] === segment,
    )
    if (!belongsToRoot) continue

    insertPath(root, segments.slice(rootSegments.length))
  }

  return finalizeDirectory(root)
}
