import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFileTree } from './tree.ts'

const paths = [
  '/src/app/page.tsx',
  '/src/app/layout.tsx',
  '/src/lib/utils.ts',
  '/README.md',
]

test('builds a sorted directory-first tree with recursive totals', () => {
  const tree = buildFileTree(paths, [])

  assert.equal(tree.name, 'S:')
  assert.equal(tree.path, '/')
  assert.equal(tree.directoryCount, 3)
  assert.equal(tree.fileCount, 4)
  assert.deepEqual(
    tree.children.map((node) => [node.kind, node.name]),
    [
      ['directory', 'src'],
      ['file', 'README.md'],
    ],
  )

  const src = tree.children[0]
  assert.equal(src?.kind, 'directory')
  if (src?.kind !== 'directory') throw new Error('src must be a directory')

  assert.deepEqual(
    src.children.map((node) => node.name),
    ['app', 'lib'],
  )

  const app = src.children[0]
  assert.equal(app?.kind, 'directory')
  if (app?.kind !== 'directory') throw new Error('app must be a directory')

  assert.deepEqual(
    app.children.map((node) => node.name),
    ['layout.tsx', 'page.tsx'],
  )
})

test('scopes a tree to the requested directory', () => {
  const tree = buildFileTree([...paths, '/other/ignored.txt'], ['src'])

  assert.equal(tree.name, 'src')
  assert.equal(tree.path, '/src')
  assert.equal(tree.directoryCount, 2)
  assert.equal(tree.fileCount, 3)
  assert.deepEqual(
    tree.children.map((node) => node.name),
    ['app', 'lib'],
  )
})
