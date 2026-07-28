import { readFile } from 'node:fs/promises'
import { DESTINATIONS } from '../../app/travel/destinations.ts'

const corpusUrl = new URL(
  '../../app/travel/radio-stations.json',
  import.meta.url,
)
const live = process.argv.includes('--live')
const MAX_CONCURRENCY = 6
const STREAM_TIMEOUT_MS = 10_000
const MIN_AUDIO_BYTES = 1_024
const MAX_PLAYLIST_BYTES = 64 * 1_024

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

type LiveResult = {
  station: StationRecord
  status: number | null
  contentType: string | null
  bytesRead: number
  finalUrl: string | null
  working: boolean
  reason: string | null
}

const stations = JSON.parse(
  await readFile(corpusUrl, 'utf8'),
) as StationRecord[]

const errors: string[] = []
const destinationCodes = new Set(
  DESTINATIONS.map((destination) => destination.code),
)
const stationsByDestination = new Map<string, StationRecord[]>()
const allStreamUrls = new Set<string>()
const allStationUuids = new Set<string>()

for (const [index, station] of stations.entries()) {
  const label = `record ${index + 1} (${station.station || 'unnamed'})`
  if (!destinationCodes.has(station.destinationCode)) {
    errors.push(`${label}: unknown destination ${station.destinationCode}`)
  }
  if (!station.station.trim()) errors.push(`${label}: station name is empty`)
  if (!station.streamUrl.startsWith('https://')) {
    errors.push(`${label}: stream is not HTTPS`)
  }
  if (
    /(?:rj-tok|wmsAuthSign|[?&](?:token|zt)=|[?&]_art=)/i.test(
      station.streamUrl,
    )
  ) {
    errors.push(`${label}: stream URL contains a short-lived token`)
  }
  if (!['AAC', 'HLS', 'MP3', 'OGG'].includes(station.format)) {
    errors.push(`${label}: unsupported format ${station.format}`)
  }
  if (
    station.bitrateKbps !== null &&
    (!Number.isFinite(station.bitrateKbps) || station.bitrateKbps <= 0)
  ) {
    errors.push(`${label}: invalid bitrate`)
  }
  if (
    (station.latitude === null) !== (station.longitude === null) ||
    (station.latitude !== null &&
      (station.latitude < -90 || station.latitude > 90)) ||
    (station.longitude !== null &&
      (station.longitude < -180 || station.longitude > 180))
  ) {
    errors.push(`${label}: invalid coordinate pair`)
  }
  if (Number.isNaN(Date.parse(station.verifiedAt))) {
    errors.push(`${label}: invalid verification timestamp`)
  }
  if (
    station.verification?.working !== true ||
    !Number.isInteger(station.verification?.httpStatus) ||
    !station.verification?.contentType
  ) {
    errors.push(`${label}: incomplete stored verification`)
  }
  if (
    station.directorySource !== 'Radio Browser' &&
    station.directorySource !== 'Official station website'
  ) {
    errors.push(`${label}: unsupported directory source`)
  }

  const normalizedUrl = station.streamUrl.trim().replace(/\/+$/, '')
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

  const grouped = stationsByDestination.get(station.destinationCode)
  if (grouped) grouped.push(station)
  else stationsByDestination.set(station.destinationCode, [station])
}

for (const destination of DESTINATIONS) {
  const grouped = stationsByDestination.get(destination.code) ?? []
  if (grouped.length < 3 || grouped.length > 5) {
    errors.push(
      `${destination.code}: expected 3–5 stations, found ${grouped.length}`,
    )
  }
  const urls = new Set<string>()
  const names = new Set<string>()
  for (const station of grouped) {
    const normalized = station.streamUrl.trim().replace(/\/+$/, '')
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

const contentTypeOf = (response: Response): string =>
  response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ??
  ''

const isPlaylist = (station: StationRecord, contentType: string): boolean =>
  station.format === 'HLS' ||
  station.streamUrl.toLowerCase().includes('.m3u8') ||
  contentType.includes('mpegurl')

const isAudioContentType = (contentType: string): boolean =>
  contentType.startsWith('audio/') ||
  contentType === 'application/ogg' ||
  contentType === 'application/octet-stream'

const verifyStation = async (station: StationRecord): Promise<LiveResult> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)
  let status: number | null = null
  let contentType: string | null = null
  let finalUrl: string | null = null
  let bytesRead = 0

  try {
    const response = await fetch(station.streamUrl, {
      headers: {
        Accept:
          'audio/mpeg,audio/aac,audio/ogg,application/vnd.apple.mpegurl,application/x-mpegURL;q=0.9,*/*;q=0.2',
        'Icy-MetaData': '0',
        'User-Agent': 'sospedra.me travel-radio verifier/1.0',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    status = response.status
    contentType = contentTypeOf(response)
    finalUrl = response.url

    if (!response.ok) {
      return {
        station,
        status,
        contentType,
        bytesRead,
        finalUrl,
        working: false,
        reason: `HTTP ${response.status}`,
      }
    }
    if (contentType.includes('text/html')) {
      return {
        station,
        status,
        contentType,
        bytesRead,
        finalUrl,
        working: false,
        reason: 'HTML response',
      }
    }
    if (!response.body) {
      return {
        station,
        status,
        contentType,
        bytesRead,
        finalUrl,
        working: false,
        reason: 'empty response body',
      }
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    const byteGoal = isPlaylist(station, contentType)
      ? MAX_PLAYLIST_BYTES
      : MIN_AUDIO_BYTES

    while (bytesRead < byteGoal) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        bytesRead += value.byteLength
      }
      if (!isPlaylist(station, contentType) && bytesRead >= MIN_AUDIO_BYTES) {
        break
      }
    }
    void reader.cancel().catch(() => undefined)

    if (isPlaylist(station, contentType)) {
      const body = new TextDecoder().decode(
        Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
      )
      const valid = body.trimStart().startsWith('#EXTM3U')
      return {
        station,
        status,
        contentType,
        bytesRead,
        finalUrl,
        working: valid,
        reason: valid ? null : 'invalid HLS playlist',
      }
    }

    const working =
      bytesRead >= MIN_AUDIO_BYTES && isAudioContentType(contentType)
    return {
      station,
      status,
      contentType,
      bytesRead,
      finalUrl,
      working,
      reason: working
        ? null
        : `expected audio bytes, received ${contentType || 'no content type'}`,
    }
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === 'AbortError'
    const working =
      timedOut &&
      status !== null &&
      status >= 200 &&
      status < 300 &&
      bytesRead >= MIN_AUDIO_BYTES &&
      contentType !== null &&
      isAudioContentType(contentType)
    return {
      station,
      status,
      contentType,
      bytesRead,
      finalUrl,
      working,
      reason: working
        ? null
        : timedOut
          ? `timeout after ${bytesRead} bytes`
          : error instanceof Error
            ? error.message
            : 'unknown network error',
    }
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}

if (live && errors.length === 0) {
  const results: LiveResult[] = []
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < stations.length) {
      const index = nextIndex
      nextIndex += 1
      const result = await verifyStation(stations[index])
      results[index] = result
      const mark = result.working ? 'OK' : 'FAIL'
      console.log(
        `${mark} ${stations[index].destinationCode} · ${stations[index].station} · ${result.status ?? 'ERR'} · ${result.contentType ?? 'unknown'} · ${result.bytesRead} B`,
      )
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENCY, stations.length) }, worker),
  )

  const failed = results.filter((result) => !result.working)
  if (failed.length > 0) {
    console.error(`Live verification failed for ${failed.length} streams:`)
    for (const result of failed) {
      console.error(
        `- ${result.station.destinationCode} · ${result.station.station}: ${result.reason}`,
      )
    }
    process.exitCode = 1
  } else {
    console.log(`Live verification OK: ${results.length} direct streams.`)
  }
}
