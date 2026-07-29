import { readFile } from 'node:fs/promises'
import { PRESENTATION } from '../../app/w98/realplayer/presentation.ts'
import type { StationRecord } from '../../app/w98/realplayer/stations.ts'

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
const MAX_CONCURRENCY = 6
const STREAM_TIMEOUT_MS = 10_000
const MIN_AUDIO_BYTES = 1_024

type LiveResult = {
  id: string
  status: number | null
  contentType: string | null
  bytesRead: number
  finalUrl: string | null
  working: boolean
  reason: string | null
}

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

const contentTypeOf = (response: Response): string =>
  response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ??
  ''

const isAudioContentType = (contentType: string): boolean =>
  contentType.startsWith('audio/') || contentType === 'application/octet-stream'

const verifyStation = async (
  station: (typeof REAL_STATIONS)[number],
): Promise<LiveResult> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)
  let status: number | null = null
  let contentType: string | null = null
  let finalUrl: string | null = null
  let bytesRead = 0

  try {
    const response = await fetch(station.streamUrl, {
      headers: {
        Accept: 'audio/mpeg,audio/aac;q=0.9,*/*;q=0.2',
        'Icy-MetaData': '0',
        'User-Agent': 'sospedra.me realplayer verifier/1.0',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    status = response.status
    contentType = contentTypeOf(response)
    finalUrl = response.url

    if (!response.ok) {
      return failure(`HTTP ${response.status}`)
    }
    if (!finalUrl.startsWith('https://')) {
      return failure(`redirected to non-HTTPS ${finalUrl}`)
    }
    if (!response.body) {
      return failure('empty response body')
    }

    const reader = response.body.getReader()
    while (bytesRead < MIN_AUDIO_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) bytesRead += value.byteLength
    }
    void reader.cancel().catch(() => undefined)

    const working =
      bytesRead >= MIN_AUDIO_BYTES && isAudioContentType(contentType)
    return {
      id: station.id,
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
    return failure(
      error instanceof DOMException && error.name === 'AbortError'
        ? `timeout after ${bytesRead} bytes`
        : error instanceof Error
          ? error.message
          : 'unknown network error',
    )
  } finally {
    clearTimeout(timer)
    controller.abort()
  }

  function failure(reason: string): LiveResult {
    return {
      id: station.id,
      status,
      contentType,
      bytesRead,
      finalUrl,
      working: false,
      reason,
    }
  }
}

if (live && errors.length === 0) {
  const results: LiveResult[] = []
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < REAL_STATIONS.length) {
      const index = nextIndex
      nextIndex += 1
      const result = await verifyStation(REAL_STATIONS[index])
      results[index] = result
      const mark = result.working ? 'OK' : 'FAIL'
      console.log(
        `${mark} ${result.id} · ${result.status ?? 'ERR'} · ${result.contentType ?? 'unknown'} · ${result.bytesRead} B`,
      )
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENCY, REAL_STATIONS.length) },
      worker,
    ),
  )

  const failed = results.filter((result) => !result.working)
  if (failed.length > 0) {
    console.error(`Live verification failed for ${failed.length} streams:`)
    for (const result of failed) {
      console.error(`- ${result.id}: ${result.reason}`)
    }
    process.exitCode = 1
  } else {
    console.log(`Live verification OK: ${results.length} streams.`)
  }
}
