import assert from 'node:assert/strict'
import test from 'node:test'
import { runCommand } from './command-shell.ts'
import { complete } from './console-complete.ts'
import { type Resolved, resolvePath } from './console-path.ts'

const paths = [
  '/src/app/page.tsx',
  '/src/app/layout.tsx',
  '/src/lib/utils.ts',
  '/README.md',
]

const links = [
  {
    source: '/go/readme',
    title: 'Read me',
    destination: 'https://example.com',
  },
]

const context = { paths, links, cwd: [] }

test('resolvePath verdicts paths against the drive', () => {
  const cases: Array<{
    label: string
    cwd: string[]
    arg: string
    expected: Resolved | null
  }> = [
    {
      label: 'descends into a directory',
      cwd: [],
      arg: 'src',
      expected: { kind: 'dir', segments: ['src'] },
    },
    {
      label: 'matches directories case-insensitively',
      cwd: [],
      arg: 'SRC/App',
      expected: { kind: 'dir', segments: ['src', 'app'] },
    },
    {
      label: 'climbs with ..',
      cwd: ['src', 'app'],
      arg: '..',
      expected: { kind: 'dir', segments: ['src'] },
    },
    {
      label: 'climbs through .. mid-path',
      cwd: [],
      arg: 'src/app/../lib',
      expected: { kind: 'dir', segments: ['src', 'lib'] },
    },
    {
      label: 'stops climbing at the root',
      cwd: [],
      arg: '../..',
      expected: { kind: 'dir', segments: [] },
    },
    {
      label: 'resolves an absolute path from anywhere',
      cwd: ['src'],
      arg: '/README.md',
      expected: { kind: 'file', segments: ['README.md'] },
    },
    {
      label: 'returns the canonical name on a caseless file match',
      cwd: [],
      arg: 'readme.MD',
      expected: { kind: 'file', segments: ['README.md'] },
    },
    {
      label: 'verdicts a nested file as a file',
      cwd: [],
      arg: 'src/lib/utils.ts',
      expected: { kind: 'file', segments: ['src', 'lib', 'utils.ts'] },
    },
    {
      label: 'rejects a missing entry',
      cwd: [],
      arg: 'src/missing',
      expected: null,
    },
    {
      label: 'rejects a file used as a directory',
      cwd: [],
      arg: 'README.md/deeper',
      expected: null,
    },
  ]

  for (const { label, cwd, arg, expected } of cases) {
    assert.deepEqual(resolvePath(paths, cwd, arg), expected, label)
  }
})

test('runCommand help returns the help table', () => {
  const result = runCommand(context, 'help')
  assert.deepEqual(result.output, [{ kind: 'help' }])
  assert.deepEqual(result.cwd, [])
})

test('runCommand ls lists a directory', () => {
  const root = runCommand(context, 'ls')
  assert.deepEqual(root.output, [
    { kind: 'listing', path: '/', dirs: ['src'], files: ['README.md'] },
  ])

  const nested = runCommand(context, 'ls src/app')
  assert.deepEqual(nested.output, [
    {
      kind: 'listing',
      path: '/src/app',
      dirs: [],
      files: ['layout.tsx', 'page.tsx'],
    },
  ])
})

test('runCommand cd descends, climbs, and bare cd returns home', () => {
  assert.deepEqual(runCommand(context, 'cd src/app').cwd, ['src', 'app'])
  assert.deepEqual(
    runCommand({ ...context, cwd: ['src', 'app'] }, 'cd ..').cwd,
    ['src'],
  )
  assert.deepEqual(runCommand({ ...context, cwd: ['src'] }, 'cd').cwd, [])
})

test('runCommand url copies the short link for a code', () => {
  const result = runCommand(context, 'url readme')
  const effect = result.effect
  assert.equal(effect?.kind, 'copy')
  if (effect?.kind !== 'copy') throw new Error('url must copy')
  assert.ok(effect.text.endsWith('/go/readme'))
})

test('runCommand rejects an unknown command', () => {
  const result = runCommand(context, 'frobnicate')
  assert.deepEqual(result.output, [
    {
      kind: 'text',
      text: 'Bad command or file name — FROBNICATE',
      tone: 'error',
    },
  ])
  assert.deepEqual(result.cwd, [])
})

test('completes tree commands and arguments with directories only', () => {
  const treeContext = { ...context, paths: [...paths, '/images/hero.png'] }
  const options = {
    directoryOnlyCommands: ['tree'],
    extraCommandNames: ['tree'],
  }

  assert.deepEqual(complete(treeContext, 'tr', options), {
    value: 'tr',
    options: ['travel', 'tree'],
  })
  assert.deepEqual(complete(treeContext, 'tree im', options), {
    value: 'tree images/',
    options: [],
  })
  assert.deepEqual(complete(treeContext, 'tree R', options), {
    value: 'tree R',
    options: [],
  })
})

test('goto emits a navigate effect for a known route', () => {
  const result = runCommand(context, 'goto travel')
  assert.deepEqual(result.effect, { kind: 'navigate', href: '/travel' })
  assert.deepEqual(result.output, [
    { kind: 'text', text: 'Routing signal to TRAVEL...', tone: undefined },
  ])
})

test('goto accepts a leading slash and rejects unknown routes', () => {
  assert.deepEqual(runCommand(context, 'goto /w98').effect, {
    kind: 'navigate',
    href: '/w98',
  })
  const missing = runCommand(context, 'goto nowhere')
  assert.equal(missing.effect, undefined)
  assert.deepEqual(missing.output, [
    { kind: 'text', text: 'No route named — nowhere', tone: 'error' },
  ])
})

test('bare route words and legacy nicknames navigate', () => {
  assert.deepEqual(runCommand(context, 'meridian').effect, {
    kind: 'navigate',
    href: '/meridian',
  })
  assert.deepEqual(runCommand(context, 'cims').effect, {
    kind: 'navigate',
    href: '/cims',
  })
  assert.deepEqual(runCommand(context, 'tapes').effect, {
    kind: 'navigate',
    href: '/videoclub',
  })
  assert.deepEqual(runCommand(context, 'cube').effect, {
    kind: 'navigate',
    href: '/rubiks',
  })
})
