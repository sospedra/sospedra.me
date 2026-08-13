import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import {
  check,
  errors,
  PUBLIC_ROOT,
  REPOSITORY_ROOT,
  sha256,
} from './lib-validate-core.ts'
import type {
  AssetEntry,
  AssetManifest,
  CorpusSourceLock,
  CountryCorpus,
  GenerationApproval,
  SourceLock,
} from './lib-validate-types.ts'

export const validateLockedFile = (
  label: string,
  entry: { path: string; sha256: string },
): void => {
  const path = resolve(REPOSITORY_ROOT, entry.path)
  const relativePath = relative(REPOSITORY_ROOT, path)
  if (
    relativePath.startsWith(`..${sep}`) ||
    relativePath === '..' ||
    relativePath.includes(`..${sep}`)
  ) {
    errors.push(`${label} source path escapes the repository`)
    return
  }
  if (!existsSync(path)) {
    errors.push(`Missing locked ${label} source: ${entry.path}`)
    return
  }
  check(
    sha256(readFileSync(path)) === entry.sha256,
    `${label} source checksum differs from its lock`,
  )
}

export const assetFileForUrl = (url: string): string | undefined => {
  if (!url.startsWith('/games/geo/assets/')) {
    errors.push(`Asset URL is outside the geography asset root: ${url}`)
    return undefined
  }
  const path = resolve(PUBLIC_ROOT, url.slice(1))
  const relativePath = relative(PUBLIC_ROOT, path)
  if (
    relativePath.startsWith(`..${sep}`) ||
    relativePath === '..' ||
    relativePath.includes(`..${sep}`)
  ) {
    errors.push(`Asset URL escapes the public directory: ${url}`)
    return undefined
  }
  return path
}

export const validateAsset = (
  entry: AssetEntry | undefined,
  expectedKind: 'shape' | 'flag',
  expectedCode: string,
): void => {
  if (!entry) {
    errors.push(
      `Missing asset manifest entry for ${expectedKind} ${expectedCode}`,
    )
    return
  }
  const path = assetFileForUrl(entry.url)
  if (!path || !existsSync(path)) {
    errors.push(`Missing asset file: ${entry.url}`)
    return
  }
  const filename = path.split(sep).at(-1) ?? ''
  check(
    /^[a-f0-9]{20}\.svg$/u.test(filename),
    `${expectedKind} ${expectedCode} must use a 20-character content-hash filename`,
  )
  const bytes = readFileSync(path)
  const digest = sha256(bytes)
  check(
    digest === entry.sha256,
    `${expectedKind} ${expectedCode} SHA-256 differs from the manifest`,
  )
  check(
    filename === `${digest.slice(0, 20)}.svg`,
    `${expectedKind} ${expectedCode} filename does not match its content hash`,
  )
  check(
    bytes.length === entry.bytes,
    `${expectedKind} ${expectedCode} byte count differs from the manifest`,
  )
  const maximumBytes = expectedKind === 'shape' ? 32 * 1024 : 64 * 1024
  const transferredBytes = gzipSync(bytes).length
  check(
    transferredBytes <= maximumBytes,
    `${expectedKind} ${expectedCode} exceeds ${maximumBytes} bytes gzip`,
  )
  const source = bytes.toString('utf8')
  check(
    !/<script\b|javascript:|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']https?:/iu.test(
      source,
    ),
    `${expectedKind} ${expectedCode} contains active or remote SVG content`,
  )
  if (expectedKind === 'shape') {
    const tagNames = [...source.matchAll(/<\/?([a-z][a-z0-9:-]*)\b/giu)].map(
      (match) => match[1].toLocaleLowerCase('en'),
    )
    check(
      tagNames.every((tagName) => tagName === 'svg' || tagName === 'path'),
      `shape ${expectedCode} must contain path geometry only`,
    )
  }
}

export const validateSourceLocks = ({
  manifest,
  sourceLock,
  corpusSourceLock,
  approval,
}: {
  manifest: AssetManifest
  sourceLock: SourceLock
  corpusSourceLock: CorpusSourceLock
  approval: GenerationApproval
}): void => {
  check(
    manifest.naturalEarth.countries.sha256 ===
      sourceLock.naturalEarth.files.countries.sha256 &&
      manifest.naturalEarth.land.sha256 ===
        sourceLock.naturalEarth.files.land.sha256,
    'Natural Earth checksums differ between the asset manifest and source lock',
  )
  check(
    manifest.flagIcons.version === sourceLock.flagIcons.version,
    'flag-icons versions differ between the asset manifest and source lock',
  )
  check(
    [
      sourceLock.naturalEarth.license,
      sourceLock.cldr.license,
      sourceLock.flagIcons.license,
      sourceLock.wikidata.license,
      sourceLock.wikidata.responseSha256,
    ].every((value) => typeof value === 'string' && value.trim().length > 0),
    'A required source licence or response digest is missing',
  )
  check(
    [
      corpusSourceLock.geonames.snapshotDate,
      corpusSourceLock.geonames.license,
      corpusSourceLock.worldBank.termsUrl,
    ].every((value) => typeof value === 'string' && value.trim().length > 0),
    'A required city-corpus licence or snapshot marker is missing',
  )
  check(
    corpusSourceLock.worldBank.indicator === 'SP.POP.TOTL',
    'City coverage must use the World Bank total-population indicator',
  )
  check(
    corpusSourceLock.naturalEarth.file.sha256 ===
      sourceLock.naturalEarth.files.countries.sha256,
    'Country geometry checksum differs between source locks',
  )
  for (const [name, entry] of Object.entries(corpusSourceLock.geonames.files)) {
    validateLockedFile(`GeoNames ${name}`, entry)
  }
  validateLockedFile('World Bank population', corpusSourceLock.worldBank.file)
  validateLockedFile(
    'Natural Earth country geometry',
    corpusSourceLock.naturalEarth.file,
  )
  const wikidataQueryPath = resolve(
    REPOSITORY_ROOT,
    sourceLock.wikidata.queryFile,
  )
  check(
    existsSync(wikidataQueryPath),
    `Missing Wikidata query: ${sourceLock.wikidata.queryFile}`,
  )
  if (existsSync(wikidataQueryPath)) {
    check(
      sha256(readFileSync(wikidataQueryPath)) ===
        sourceLock.wikidata.querySha256,
      'Wikidata query checksum differs from the source lock',
    )
  }
  check(existsSync(join(REPOSITORY_ROOT, 'CREDITS.txt')), 'Missing CREDITS.txt')
  check(
    approval.reviewBasis === 'automated-source-and-policy-validation',
    'Approval must describe its automated review basis honestly',
  )
}

export const validateGeneratedAssets = ({
  manifest,
  corpus,
}: {
  manifest: AssetManifest
  corpus: CountryCorpus
}): void => {
  for (const [code, entry] of Object.entries(manifest.shapes)) {
    validateAsset(entry, 'shape', code)
  }
  for (const [code, entry] of Object.entries(manifest.flags)) {
    validateAsset(entry, 'flag', code)
  }
  check(
    Object.keys(manifest.shapes).length ===
      corpus.countries.filter(
        (country) =>
          country.status === 'active' && country.eligibility.shape === true,
      ).length,
    'Asset manifest must contain one shape per shape-eligible country',
  )
  check(
    Object.keys(manifest.flags).length ===
      corpus.countries.filter(
        (country) =>
          country.status === 'active' && country.eligibility.flag === true,
      ).length,
    'Asset manifest must contain one flag per flag-eligible country',
  )

  const mapPath = assetFileForUrl(manifest.map.url)
  if (!mapPath || !existsSync(mapPath)) {
    errors.push(`Missing world map: ${manifest.map.url}`)
  } else {
    const mapBytes = readFileSync(mapPath)
    check(
      manifest.map.url === '/games/geo/assets/map/world-map.svg',
      'World map must use its stable public URL',
    )
    check(
      sha256(mapBytes) === manifest.map.sha256,
      'World-map SHA-256 differs from the manifest',
    )
    check(
      mapBytes.length === manifest.map.bytes,
      'World-map byte count differs from the manifest',
    )
    check(mapBytes.length <= 150 * 1024, 'World map exceeds 150 KB')
    check(
      manifest.map.projection === 'WebMercatorCropped',
      'World-map projection must be documented as WebMercatorCropped',
    )
    const mapSource = mapBytes.toString('utf8')
    const mapTagNames = [
      ...mapSource.matchAll(/<\/?([a-z][a-z0-9:-]*)\b/giu),
    ].map((match) => match[1].toLocaleLowerCase('en'))
    check(
      mapTagNames.every((tagName) => tagName === 'svg' || tagName === 'path'),
      'World map must contain path geometry only',
    )
  }

  const expectedAssetFiles = new Set([
    ...Object.values(manifest.shapes).map(({ url }) => url),
    ...Object.values(manifest.flags).map(({ url }) => url),
  ])
  for (const kind of ['shapes', 'flags'] as const) {
    const directory = join(PUBLIC_ROOT, 'games/geo/assets', kind)
    for (const filename of readdirSync(directory)) {
      const url = `/games/geo/assets/${kind}/${filename}`
      check(
        expectedAssetFiles.has(url),
        `Unreferenced generated asset must be removed: ${url}`,
      )
    }
  }
}
