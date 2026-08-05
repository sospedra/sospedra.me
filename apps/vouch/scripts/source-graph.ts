import { readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { sha256 } from '@noble/hashes/sha2.js'
import ts from 'typescript'
import { ascii } from '../src/protocol/bytes.ts'
import type { SourceFileDigest } from '../src/protocol/program.ts'

function normalizeText(raw: string): string {
  return raw.replaceAll('\r\n', '\n')
}

function readNormalized(absolutePath: string): string {
  return normalizeText(readFileSync(absolutePath, 'utf8'))
}

function moduleSpecifiersIn(sourceText: string): string[] {
  const sourceFile = ts.createSourceFile(
    'source.ts',
    sourceText,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  )
  return sourceFile.statements
    .filter(
      (node) => ts.isImportDeclaration(node) || ts.isExportDeclaration(node),
    )
    .map(
      (node) =>
        (node as ts.ImportDeclaration | ts.ExportDeclaration).moduleSpecifier,
    )
    .filter(
      (specifier): specifier is ts.StringLiteral =>
        specifier !== undefined && ts.isStringLiteral(specifier),
    )
    .map((specifier) => specifier.text)
}

function isLocalSourceSpecifier(specifier: string): boolean {
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
  return isRelative && specifier.endsWith('.ts')
}

function unvisitedDependenciesOf(
  absolutePath: string,
  visited: ReadonlySet<string>,
): string[] {
  const specifiers = moduleSpecifiersIn(readNormalized(absolutePath)).filter(
    isLocalSourceSpecifier,
  )
  const resolved = specifiers.map((specifier) =>
    join(dirname(absolutePath), specifier),
  )
  return resolved.filter((dependency) => !visited.has(dependency))
}

function collectSourceClosure(entryAbsolutePath: string): string[] {
  const visited = new Set<string>([entryAbsolutePath])
  const queue = [entryAbsolutePath]
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    const next = unvisitedDependenciesOf(current, visited)
    for (const dependency of next) visited.add(dependency)
    queue.push(...next)
  }
  return Array.from(visited)
}

function toPosixRelative(packageRoot: string, absolutePath: string): string {
  return relative(packageRoot, absolutePath).split(sep).join('/')
}

export function collectProgramSourceFiles(
  packageRoot: string,
  entryRelativePath: string,
): SourceFileDigest[] {
  const entryAbsolutePath = join(packageRoot, entryRelativePath)
  const closure = collectSourceClosure(entryAbsolutePath)
  return closure.map((absolutePath) => ({
    path: toPosixRelative(packageRoot, absolutePath),
    digest: sha256(ascii(readNormalized(absolutePath))),
  }))
}
