import * as z from 'zod/mini'
import { extensionOf } from './format.ts'
import type { LocalMusicTrack } from './types'

export const BUNDLED_PLAYLIST_MANIFEST_URL =
  '/music/bonfire/playlist.json' as const

const fileNameOf = (fileUrl: string): string => {
  const path = fileUrl.split('?', 1)[0].split('#', 1)[0]
  return path.split('/').at(-1) ?? ''
}

const requiredText = z.string().check(z.trim(), z.minLength(1))

const bundledEntrySchema = z.pipe(
  z.object({
    artist: requiredText,
    durationMs: z.number().check(z.gte(0)),
    fileUrl: requiredText,
    id: z
      .union([z.string(), z.number()])
      .check(z.refine((id) => String(id).trim() !== '')),
    title: requiredText,
  }),
  z.transform(
    (entry): LocalMusicTrack => ({
      album: '',
      artist: entry.artist,
      duration: Math.round(entry.durationMs),
      id: `bundled:${String(entry.id).trim()}`,
      kind: 'local',
      src: entry.fileUrl,
      title: entry.title,
      type: extensionOf(fileNameOf(entry.fileUrl)),
    }),
  ),
)

const firstRepeatedId = (tracks: LocalMusicTrack[]): string | undefined => {
  const seen = new Set<string>()
  for (const track of tracks) {
    if (seen.has(track.id)) return track.id
    seen.add(track.id)
  }
  return undefined
}

const manifestEntries = z.pipe(
  z.union(
    [z.array(z.unknown()), z.object({ tracks: z.array(z.unknown()) })],
    'The default playlist manifest has an invalid shape.',
  ),
  z.transform((manifest: unknown[] | { tracks: unknown[] }) =>
    Array.isArray(manifest) ? manifest : manifest.tracks,
  ),
)

const bundledPlaylistSchema = z.pipe(
  manifestEntries,
  z.array(bundledEntrySchema).check(
    z.refine(
      (tracks) => tracks.length > 0,
      'The default playlist contains no tracks.',
    ),
    z.refine(
      (tracks: LocalMusicTrack[]) => firstRepeatedId(tracks) === undefined,
      {
        error: (issue) =>
          `The default playlist repeats track id "${firstRepeatedId(
            issue.input as LocalMusicTrack[],
          )}".`,
      },
    ),
  ),
)

const trackFailure = (issue: z.core.$ZodIssue): string => {
  const [index, field] = issue.path
  if (typeof index !== 'number') return issue.message
  if (field === undefined) {
    return `Default playlist track ${index + 1} is invalid.`
  }
  return `Default playlist track ${index + 1} has an invalid ${String(field)}.`
}

export const parseBundledPlaylist = (value: unknown): LocalMusicTrack[] => {
  const result = bundledPlaylistSchema.safeParse(value)
  if (result.success) return result.data
  throw new Error(trackFailure(result.error.issues[0]))
}
