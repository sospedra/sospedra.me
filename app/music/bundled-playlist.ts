import type { LocalMusicTrack } from './types'

export const BUNDLED_PLAYLIST_MANIFEST_URL =
  '/music/bonfire/playlist.json' as const

type BundledPlaylistEntry = {
  artist: string
  durationMs: number
  fileUrl: string
  id: number | string
  sourceUrl?: string
  title: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const playlistEntries = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (isRecord(value) && Array.isArray(value.tracks)) return value.tracks
  throw new Error('The default playlist manifest has an invalid shape.')
}

const requireString = (
  entry: Record<string, unknown>,
  key: keyof BundledPlaylistEntry,
  index: number,
): string => {
  const value = entry[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Default playlist track ${index + 1} has an invalid ${key}.`,
    )
  }
  return value.trim()
}

const extensionOf = (fileUrl: string): string => {
  const fileName = fileUrl.split(/[?#]/, 1)[0]?.split('/').at(-1) ?? ''
  const extension = fileName.split('.').at(-1)
  return extension && extension !== fileName ? extension.toUpperCase() : 'AUDIO'
}

const parseEntry = (value: unknown, index: number): LocalMusicTrack => {
  if (!isRecord(value)) {
    throw new Error(`Default playlist track ${index + 1} is invalid.`)
  }

  const rawId = value.id
  if (
    (typeof rawId !== 'string' && typeof rawId !== 'number') ||
    String(rawId).trim() === ''
  ) {
    throw new Error(`Default playlist track ${index + 1} has an invalid id.`)
  }

  const durationMs = value.durationMs
  if (
    typeof durationMs !== 'number' ||
    !Number.isFinite(durationMs) ||
    durationMs < 0
  ) {
    throw new Error(
      `Default playlist track ${index + 1} has an invalid durationMs.`,
    )
  }

  const fileUrl = requireString(value, 'fileUrl', index)
  const sourceUrl =
    typeof value.sourceUrl === 'string' && value.sourceUrl.trim() !== ''
      ? value.sourceUrl.trim()
      : undefined

  return {
    album: '',
    artist: requireString(value, 'artist', index),
    duration: Math.round(durationMs),
    id: `bundled:${String(rawId).trim()}`,
    kind: 'local',
    sourceUrl,
    src: fileUrl,
    title: requireString(value, 'title', index),
    type: extensionOf(fileUrl),
  }
}

export const parseBundledPlaylist = (value: unknown): LocalMusicTrack[] => {
  const entries = playlistEntries(value)
  if (entries.length === 0) {
    throw new Error('The default playlist contains no tracks.')
  }

  const tracks = entries.map(parseEntry)
  const ids = new Set<string>()
  for (const track of tracks) {
    if (ids.has(track.id)) {
      throw new Error(`The default playlist repeats track id "${track.id}".`)
    }
    ids.add(track.id)
  }
  return tracks
}
