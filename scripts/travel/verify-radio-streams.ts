import { readFile } from 'node:fs/promises'
import { groupBy } from 'es-toolkit'
import { DESTINATIONS } from '../../app/travel/destinations.ts'
import {
  contentTypeOf,
  isAudioContentType,
  runPool,
  verifyStream,
} from '../verify-streams.ts'

const corpusUrl = new URL(
  '../../app/travel/radio-stations.json',
  import.meta.url,
)
const live = process.argv.includes('--live')

type StationRecord = {
  station: string
  destinationCode: string
  stationUuid: string | null
  city: string | null
  country: string
  latitude: number | null
  longitude: number | null
  streamUrl: string
  format: 'AAC' | 'HLS' | 'MP3' | 'OGG'
  bitrateKbps: number | null
  homepage: string | null
  directorySource: 'Official station website' | 'Radio Browser'
  verifiedAt: string
  verification: {
    httpStatus: number
    contentType: string
    working: true
  }
}

const stations = JSON.parse(
  await readFile(corpusUrl, 'utf8'),
) as StationRecord[]

const errors: string[] = []
const destinationCodes = new Set(
  DESTINATIONS.map((destination) => destination.code),
)
const allStreamUrls = new Set<string>()
const allStationUuids = new Set<string>()

const SHORT_LIVED_TOKEN = /(?:rj-tok|wmsAuthSign|[?&](?:token|zt)=|[?&]_art=)/i
const TRAILING_SLASHES = /\/+$/

const invalidBitrate = (station: StationRecord) =>
  station.bitrateKbps !== null &&
  (!Number.isFinite(station.bitrateKbps) || station.bitrateKbps <= 0)

const invalidCoordinates = (station: StationRecord) =>
  (station.latitude === null) !== (station.longitude === null) ||
  (station.latitude !== null &&
    (station.latitude < -90 || station.latitude > 90)) ||
  (station.longitude !== null &&
    (station.longitude < -180 || station.longitude > 180))

const incompleteVerification = (station: StationRecord) =>
  station.verification?.working !== true ||
  !Number.isInteger(station.verification?.httpStatus) ||
  !station.verification?.contentType

const CHECKS: ((station: StationRecord) => string | null)[] = [
  (station) =>
    destinationCodes.has(station.destinationCode)
      ? null
      : `unknown destination ${station.destinationCode}`,
  (station) => (station.station.trim() ? null : 'station name is empty'),
  (station) =>
    station.streamUrl.startsWith('https://') ? null : 'stream is not HTTPS',
  (station) =>
    SHORT_LIVED_TOKEN.test(station.streamUrl)
      ? 'stream URL contains a short-lived token'
      : null,
  (station) =>
    ['AAC', 'HLS', 'MP3', 'OGG'].includes(station.format)
      ? null
      : `unsupported format ${station.format}`,
  (station) => (invalidBitrate(station) ? 'invalid bitrate' : null),
  (station) => (invalidCoordinates(station) ? 'invalid coordinate pair' : null),
  (station) =>
    Number.isNaN(Date.parse(station.verifiedAt))
      ? 'invalid verification timestamp'
      : null,
  (station) =>
    incompleteVerification(station) ? 'incomplete stored verification' : null,
  (station) =>
    station.directorySource === 'Radio Browser' ||
    station.directorySource === 'Official station website'
      ? null
      : 'unsupported directory source',
]

for (const [index, station] of stations.entries()) {
  const label = `record ${index + 1} (${station.station || 'unnamed'})`
  for (const check of CHECKS) {
    const problem = check(station)
    if (problem) errors.push(`${label}: ${problem}`)
  }

  const normalizedUrl = station.streamUrl.trim().replace(TRAILING_SLASHES, '')
  if (allStreamUrls.has(normalizedUrl)) {
    errors.push(`${label}: stream duplicates another destination`)
  }
  allStreamUrls.add(normalizedUrl)
  if (station.stationUuid) {
    if (allStationUuids.has(station.stationUuid)) {
      errors.push(`${label}: Radio Browser UUID is duplicated`)
    }
    allStationUuids.add(station.stationUuid)
  }
}

const stationsByDestination = groupBy(
  stations,
  (station) => station.destinationCode,
)
for (const destination of DESTINATIONS) {
  const grouped = stationsByDestination[destination.code] ?? []
  if (grouped.length < 3 || grouped.length > 5) {
    errors.push(
      `${destination.code}: expected 3–5 stations, found ${grouped.length}`,
    )
  }
  const urls = new Set<string>()
  const names = new Set<string>()
  for (const station of grouped) {
    const normalized = station.streamUrl.trim().replace(TRAILING_SLASHES, '')
    if (urls.has(normalized)) {
      errors.push(`${destination.code}: duplicate stream ${station.streamUrl}`)
    }
    urls.add(normalized)
    const normalizedName = station.station.trim().toLocaleLowerCase('en')
    if (names.has(normalizedName)) {
      errors.push(
        `${destination.code}: duplicate station name ${station.station}`,
      )
    }
    names.add(normalizedName)
  }
  if (grouped.every((station) => station.format === 'HLS')) {
    errors.push(
      `${destination.code}: needs one direct MP3, AAC, or OGG fallback for browsers without native HLS`,
    )
  }
}

if (errors.length > 0) {
  console.error(`Radio corpus failed ${errors.length} offline checks:`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Radio corpus OK: ${stations.length} streams across ${DESTINATIONS.length} destinations.`,
  )
}

const isTravelAudio = (contentType: string) =>
  isAudioContentType(contentType) || contentType === 'application/ogg'

const isHlsPlaylist = (station: StationRecord, contentType: string) =>
  station.format === 'HLS' ||
  station.streamUrl.toLowerCase().includes('.m3u8') ||
  contentType.includes('mpegurl')

const rejectHtml = (response: Response) =>
  contentTypeOf(response).includes('text/html') ? 'HTML response' : null

const verifyStation = (station: StationRecord) =>
  verifyStream({
    streamUrl: station.streamUrl,
    accept:
      'audio/mpeg,audio/aac,audio/ogg,application/vnd.apple.mpegurl,application/x-mpegURL;q=0.9,*/*;q=0.2',
    userAgent: 'sospedra.me travel-radio verifier/1.0',
    isAudio: isTravelAudio,
    isPlaylist: (contentType) => isHlsPlaylist(station, contentType),
    responseCheck: rejectHtml,
  })

if (live && errors.length === 0) {
  const results = await runPool(stations, async (station) => {
    const result = await verifyStation(station)
    const mark = result.working ? 'OK' : 'FAIL'
    console.log(
      `${mark} ${station.destinationCode} · ${station.station} · ${result.status ?? 'ERR'} · ${result.contentType ?? 'unknown'} · ${result.bytesRead} B`,
    )
    return result
  })

  const failures = results
    .map((result, index) => ({ result, station: stations[index] }))
    .filter(({ result }) => !result.working)
  if (failures.length > 0) {
    console.error(`Live verification failed for ${failures.length} streams:`)
    for (const { station, result } of failures) {
      console.error(
        `- ${station.destinationCode} · ${station.station}: ${result.reason}`,
      )
    }
    process.exitCode = 1
  } else {
    console.log(`Live verification OK: ${results.length} direct streams.`)
  }
}
