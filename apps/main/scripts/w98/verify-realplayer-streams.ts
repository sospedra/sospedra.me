import { readFile } from 'node:fs/promises'
import { PRESENTATION } from '../../app/w98/realplayer/presentation.ts'
import type { StationRecord } from '../../app/w98/realplayer/stations.ts'
import { runPool, verifyStream } from '../verify-streams.ts'

const corpusUrl = new URL(
  '../../app/w98/realplayer/stations.json',
  import.meta.url,
)

type RealStation = StationRecord & (typeof PRESENTATION)[number]

const records = JSON.parse(await readFile(corpusUrl, 'utf8')) as StationRecord[]
const presentationById = new Map(PRESENTATION.map((entry) => [entry.id, entry]))

const REAL_STATIONS: RealStation[] = records.map((record) => ({
  ...record,
  ...(presentationById.get(record.id) ?? {
    id: record.id,
    tagline: '',
    badge: { mark: '', bg: '', fg: '' },
  }),
}))

const live = process.argv.includes('--live')

const errors: string[] = []
const streamUrls = new Set<string>()
const marks = new Set<string>()

if (PRESENTATION.length !== records.length) {
  errors.push(
    `presentation lists ${PRESENTATION.length} stations, corpus has ${records.length}`,
  )
}

for (const [index, station] of REAL_STATIONS.entries()) {
  const label = `station ${index + 1} (${station.id})`
  if (!presentationById.has(station.id)) {
    errors.push(`${label}: no presentation entry`)
  }
  if (!station.name.trim()) errors.push(`${label}: empty display name`)
  if (!station.tagline.trim()) errors.push(`${label}: empty tagline`)
  if (!station.streamUrl.startsWith('https://')) {
    errors.push(`${label}: stream is not HTTPS`)
  }
  if (station.format !== 'MP3') {
    errors.push(`${label}: unsupported format ${station.format}`)
  }
  if (
    station.bitrateKbps !== null &&
    (!Number.isFinite(station.bitrateKbps) || station.bitrateKbps <= 0)
  ) {
    errors.push(`${label}: invalid bitrate`)
  }
  if (Number.isNaN(Date.parse(station.verifiedAt))) {
    errors.push(`${label}: invalid verification timestamp`)
  }
  const verification = station.verification
  const verificationHolds =
    verification?.working === true &&
    Number.isInteger(verification.httpStatus) &&
    verification.httpStatus >= 200 &&
    verification.httpStatus < 300 &&
    verification.contentType.startsWith('audio/')
  if (!verificationHolds) {
    errors.push(
      `${label}: stored verification does not prove a working audio stream`,
    )
  }
  if (station.badge.mark.length === 0 || station.badge.mark.length > 4) {
    errors.push(`${label}: badge mark must be 1-4 characters`)
  }

  const normalizedUrl = station.streamUrl.trim().replace(/\/+$/, '')
  if (streamUrls.has(normalizedUrl)) {
    errors.push(`${label}: duplicate stream URL`)
  }
  streamUrls.add(normalizedUrl)
  if (marks.has(station.badge.mark)) {
    errors.push(`${label}: duplicate badge mark ${station.badge.mark}`)
  }
  marks.add(station.badge.mark)
}

if (errors.length > 0) {
  console.error(`RealPlayer corpus failed ${errors.length} offline checks:`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`RealPlayer corpus OK: ${REAL_STATIONS.length} stations.`)
}

const rejectInsecureRedirect = (response: Response) =>
  response.url.startsWith('https://')
    ? null
    : `redirected to non-HTTPS ${response.url}`

const verifyStation = (station: RealStation) =>
  verifyStream({
    streamUrl: station.streamUrl,
    accept: 'audio/mpeg,audio/aac;q=0.9,*/*;q=0.2',
    userAgent: 'sospedra.me realplayer verifier/1.0',
    responseCheck: rejectInsecureRedirect,
  })

if (live && errors.length === 0) {
  const results = await runPool(REAL_STATIONS, async (station) => {
    const result = await verifyStation(station)
    const mark = result.working ? 'OK' : 'FAIL'
    console.log(
      `${mark} ${station.id} · ${result.status ?? 'ERR'} · ${result.contentType ?? 'unknown'} · ${result.bytesRead} B`,
    )
    return result
  })

  const failures = results
    .map((result, index) => ({ result, station: REAL_STATIONS[index] }))
    .filter(({ result }) => !result.working)
  if (failures.length > 0) {
    console.error(`Live verification failed for ${failures.length} streams:`)
    for (const { station, result } of failures) {
      console.error(`- ${station.id}: ${result.reason}`)
    }
    process.exitCode = 1
  } else {
    console.log(`Live verification OK: ${results.length} streams.`)
  }
}
