import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { isNotNil } from 'es-toolkit'
import { assert, pathFromRoot, readJson } from './lib-corpus-primitives.ts'
import type {
  ArchiveFile,
  CountryInfo,
  CoveragePolicy,
  LockedFile,
  WorldBankPopulation,
  WorldBankRow,
} from './lib-corpus-types.ts'

export const sha256File = async (path: string) => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(pathFromRoot(path))) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}

export const verifyLockedFile = async (label: string, file: LockedFile) => {
  const actual = await sha256File(file.path)
  assert(
    actual === file.sha256,
    `${label} checksum mismatch: expected ${file.sha256}, received ${actual}`,
  )
}

export const streamArchiveLines = async (
  archive: ArchiveFile,
  visit: (line: string) => void,
) => {
  const child = spawn(
    'unzip',
    ['-p', pathFromRoot(archive.path), archive.archiveEntry],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  assert(child.stdout, `Cannot read ${archive.path}`)
  assert(child.stderr, `Cannot read errors from ${archive.path}`)

  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk
  })
  const closed = new Promise<number>((done, reject) => {
    child.once('error', reject)
    child.once('close', (code) => done(code ?? 1))
  })

  const lines = createInterface({
    input: child.stdout,
    crlfDelay: Number.POSITIVE_INFINITY,
  })
  for await (const line of lines) visit(line)

  const exitCode = await closed
  assert(
    exitCode === 0,
    `Cannot extract ${archive.archiveEntry} from ${archive.path}: ${stderr.trim()}`,
  )
}

export const parseCountryInfo = (path: string) => {
  const countries = new Map<string, CountryInfo>()
  const lines = readFileSync(pathFromRoot(path), 'utf8').split(/\r?\n/u)
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const fields = line.split('\t')
    const code = fields[0]
    if (!code) continue
    countries.set(code, {
      code,
      iso3: fields[1] ?? '',
      capitalName: fields[5] ?? '',
      continent: fields[8] ?? '',
    })
  }
  return countries
}

const ISO_ALPHA2 = /^[A-Z]{2}$/u

const isValidPopulationValue = (value: unknown): boolean =>
  value === null ||
  (typeof value === 'number' && Number.isInteger(value) && value >= 0)

const parseWorldBankRow = (
  row: WorldBankRow,
  policy: CoveragePolicy,
): WorldBankPopulation | null => {
  const code = row.country?.id
  if (!code || !ISO_ALPHA2.test(code)) return null
  if (row.indicator?.id !== policy.countryPopulation.indicator) return null
  const year = Number(row.date)
  assert(Number.isInteger(year), `World Bank ${code} has an invalid year`)
  assert(
    isValidPopulationValue(row.value),
    `World Bank ${code} has an invalid population`,
  )
  return {
    code,
    iso3: row.countryiso3code ?? '',
    year,
    value: row.value ?? null,
  }
}

export const parseWorldBank = (path: string, policy: CoveragePolicy) => {
  const document = readJson<[unknown, WorldBankRow[]]>(path)
  assert(
    Array.isArray(document) && Array.isArray(document[1]),
    'World Bank snapshot must use its two-element API response format',
  )
  const populations = document[1]
    .map((row) => parseWorldBankRow(row, policy))
    .filter(isNotNil)
  return new Map(populations.map((population) => [population.code, population]))
}
