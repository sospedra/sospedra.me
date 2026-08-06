import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ascii, hex, unhex } from '../src/protocol/bytes.ts'
import {
  deriveProgramId,
  deriveProgramSourceHash,
  framedDigest,
  type ProgramKind,
} from '../src/protocol/program.ts'
import { collectProgramSourceFiles } from './source-graph.ts'

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = join(PACKAGE_ROOT, '..', '..')

const PROGRAM_ENTRY: Record<ProgramKind, string> = {
  update: 'src/protocol/transition.ts',
  query: 'src/protocol/query.ts',
}

type PackageJson = {
  engines?: { node?: string }
  packageManager?: string
  scripts?: Record<string, string>
}

function readJson<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, 'utf8')) as T
}

function readNormalized(absolutePath: string): string {
  return readFileSync(absolutePath, 'utf8').replaceAll('\r\n', '\n')
}

function requireField<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`program-id: missing ${label}`)
  return value
}

export type SourceOverrides = {
  sourceCommit: string
  sourceRepository: string
}

function readFlag(argv: string[], name: string): string {
  const prefix = `--${name}=`
  const match = argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : ''
}

export function parseSourceOverrides(argv: string[]): SourceOverrides {
  return {
    sourceCommit: readFlag(argv, 'source-commit'),
    sourceRepository: readFlag(argv, 'source-repository'),
  }
}

type ToolchainFacts = {
  nodeEngine: string
  typescriptVersion: string
  packageManager: string
}

function readToolchainFacts(): ToolchainFacts {
  const appPackageJson = readJson<PackageJson>(
    join(PACKAGE_ROOT, 'package.json'),
  )
  const rootPackageJson = readJson<PackageJson>(join(REPO_ROOT, 'package.json'))
  const typescriptPackageJson = readJson<{ version?: string }>(
    join(PACKAGE_ROOT, 'node_modules', 'typescript', 'package.json'),
  )
  return {
    nodeEngine: requireField(
      appPackageJson.engines?.node,
      'apps/vouch package.json engines.node',
    ),
    typescriptVersion: requireField(
      typescriptPackageJson.version,
      'node_modules/typescript package.json version',
    ),
    packageManager: requireField(
      rootPackageJson.packageManager,
      'root package.json packageManager',
    ),
  }
}

function computeToolchainHash(facts: ToolchainFacts): string {
  return hex(
    framedDigest([
      ascii(facts.nodeEngine),
      ascii(facts.typescriptVersion),
      ascii(facts.packageManager),
    ]),
  )
}

type BuildRecipeFacts = {
  buildScript: string
  viteConfig: string
  tsconfigOwn: string
  tsconfigBase: string
}

function resolveTypescriptConfigBase(): string {
  const require = createRequire(import.meta.url)
  return require.resolve('@repo/typescript-config/base.json')
}

function readBuildRecipeFacts(): BuildRecipeFacts {
  const appPackageJson = readJson<PackageJson>(
    join(PACKAGE_ROOT, 'package.json'),
  )
  return {
    buildScript: requireField(
      appPackageJson.scripts?.build,
      'apps/vouch package.json scripts.build',
    ),
    viteConfig: readNormalized(join(PACKAGE_ROOT, 'vite.config.ts')),
    tsconfigOwn: readNormalized(join(PACKAGE_ROOT, 'tsconfig.json')),
    tsconfigBase: readNormalized(resolveTypescriptConfigBase()),
  }
}

function computeBuildRecipeHash(facts: BuildRecipeFacts): string {
  return hex(
    framedDigest([
      ascii(facts.viteConfig),
      ascii(facts.tsconfigOwn),
      ascii(facts.tsconfigBase),
      ascii(facts.buildScript),
    ]),
  )
}

function computeLockfileHash(): string {
  const lockfileText = readNormalized(join(REPO_ROOT, 'pnpm-lock.yaml'))
  return hex(framedDigest([ascii(lockfileText)]))
}

type SourceFileEntry = { path: string; sha256: string }

function computeProgramSourceFiles(kind: ProgramKind): SourceFileEntry[] {
  return collectProgramSourceFiles(PACKAGE_ROOT, PROGRAM_ENTRY[kind]).map(
    (file) => ({ path: file.path, sha256: hex(file.digest) }),
  )
}

function computeProgramSourceHash(files: SourceFileEntry[]): string {
  return hex(
    deriveProgramSourceHash(
      files.map((file) => ({ path: file.path, digest: unhex(file.sha256) })),
    ),
  )
}

type SharedHashes = {
  lockfileHash: string
  toolchainHash: string
  buildRecipeHash: string
}

type ProgramManifestFixtureEntry = {
  entryFile: string
  sourceFiles: SourceFileEntry[]
  programSourceHash: string
  programId: string
}

function computeProgram(
  kind: ProgramKind,
  shared: SharedHashes,
): ProgramManifestFixtureEntry {
  const sourceFiles = computeProgramSourceFiles(kind)
  const programSourceHash = computeProgramSourceHash(sourceFiles)
  const programId = hex(
    deriveProgramId({
      lockfileHash: unhex(shared.lockfileHash),
      toolchainHash: unhex(shared.toolchainHash),
      buildRecipeHash: unhex(shared.buildRecipeHash),
      programSourceHash: unhex(programSourceHash),
    }),
  )
  return {
    entryFile: PROGRAM_ENTRY[kind],
    sourceFiles,
    programSourceHash,
    programId,
  }
}

export type ProgramManifestFixture = {
  sourceRepository: string
  sourceCommit: string
  toolchain: ToolchainFacts & { toolchainHash: string }
  buildRecipe: { buildScript: string; buildRecipeHash: string }
  lockfile: { path: string; lockfileHash: string }
  programs: Record<ProgramKind, ProgramManifestFixtureEntry>
}

export function computeProgramManifest(
  overrides: SourceOverrides = { sourceCommit: '', sourceRepository: '' },
): ProgramManifestFixture {
  const toolchainFacts = readToolchainFacts()
  const buildRecipeFacts = readBuildRecipeFacts()

  const toolchainHash = computeToolchainHash(toolchainFacts)
  const buildRecipeHash = computeBuildRecipeHash(buildRecipeFacts)
  const lockfileHash = computeLockfileHash()
  const shared: SharedHashes = { lockfileHash, toolchainHash, buildRecipeHash }

  return {
    sourceRepository: overrides.sourceRepository,
    sourceCommit: overrides.sourceCommit,
    toolchain: { ...toolchainFacts, toolchainHash },
    buildRecipe: { buildScript: buildRecipeFacts.buildScript, buildRecipeHash },
    lockfile: { path: 'pnpm-lock.yaml', lockfileHash },
    programs: {
      update: computeProgram('update', shared),
      query: computeProgram('query', shared),
    },
  }
}

function report(manifest: ProgramManifestFixture): string {
  const programLines = Object.entries(manifest.programs).map(
    ([kind, program]) =>
      `${kind}: entry=${program.entryFile} files=${program.sourceFiles.length} sourceHash=${program.programSourceHash} programId=${program.programId}`,
  )
  return [
    `source commit: ${manifest.sourceCommit || '(not provided, pass --source-commit=<hash>)'}`,
    `source repository: ${manifest.sourceRepository || '(not provided, pass --source-repository=<url>)'}`,
    `lockfile hash: ${manifest.lockfile.lockfileHash}`,
    `toolchain hash: ${manifest.toolchain.toolchainHash}`,
    `build recipe hash: ${manifest.buildRecipe.buildRecipeHash}`,
    ...programLines,
  ].join('\n')
}

if (import.meta.main) {
  const manifest = computeProgramManifest(
    parseSourceOverrides(process.argv.slice(2)),
  )
  const outFile = new URL(
    '../fixtures/protocol-v1/program-manifest.json',
    import.meta.url,
  )
  writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`)
  process.stdout.write(`${report(manifest)}\n`)
}
