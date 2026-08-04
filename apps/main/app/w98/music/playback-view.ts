import { uniqBy } from 'es-toolkit'
import { HTTPError } from 'services/http'
import { match } from 'ts-pattern'
import { extensionOf, stemOf } from './format'
import type { PlaybackState } from './playback-state'
import { BONFIRE_PLAYLIST, type SoundCloudSound } from './soundcloud'
import type { SoundCloudStatus } from './soundcloud-state'
import type { LocalMusicTrack, MusicTrack, SoundCloudMusicTrack } from './types'

export const trackFromFile = (file: File): LocalMusicTrack => {
  const stem = stemOf(file.name)
  const separator = stem.indexOf(' - ')
  const artist = separator > 0 ? stem.slice(0, separator).trim() : ''
  const title = separator > 0 ? stem.slice(separator + 3).trim() : stem

  return {
    album: '',
    artist,
    duration: 0,
    id: `${file.name}:${file.size}:${file.lastModified}:${crypto.randomUUID()}`,
    kind: 'local',
    src: URL.createObjectURL(file),
    title: title || 'Untitled',
    type: extensionOf(file.name),
  }
}

export const trackFromSoundCloud = (
  sound: SoundCloudSound,
  soundIndex: number,
): SoundCloudMusicTrack => ({
  album: '',
  artist: sound.user?.username ?? '',
  duration: sound.duration ?? 0,
  id: `soundcloud:${sound.urn ?? sound.id ?? soundIndex}`,
  kind: 'soundcloud',
  permalink: sound.permalink_url ?? BONFIRE_PLAYLIST,
  soundIndex,
  title: sound.title ?? `Track ${soundIndex + 1}`,
  type: 'SC',
})

export type DeckTracks = {
  fallbackSound: SoundCloudSound | null
  localTracks: LocalMusicTrack[]
  soundCloudTracks: SoundCloudMusicTrack[]
}

export const currentTrackOf = (
  playback: PlaybackState,
  decks: DeckTracks,
): MusicTrack | null =>
  match(playback)
    .with({ source: 'local' }, ({ index }) => decks.localTracks[index] ?? null)
    .with({ source: 'none' }, () => null)
    .with(
      { source: 'soundcloud' },
      ({ index }) =>
        decks.soundCloudTracks[index] ??
        (decks.fallbackSound
          ? trackFromSoundCloud(decks.fallbackSound, index)
          : null),
    )
    .exhaustive()

export const currentIndexOf = (
  playback: PlaybackState,
  decks: DeckTracks,
): number =>
  match(playback)
    .with({ source: 'local' }, ({ index }) =>
      decks.localTracks[index] ? decks.soundCloudTracks.length + index : -1,
    )
    .with({ source: 'none' }, () => -1)
    .with({ source: 'soundcloud' }, ({ index }) =>
      decks.soundCloudTracks[index] ? index : -1,
    )
    .exhaustive()

export const withLiveDuration = (
  localTracks: LocalMusicTrack[],
  localDeck: number,
  loadedDuration: number,
): LocalMusicTrack[] =>
  localTracks.map((track, index) =>
    index === localDeck && loadedDuration > 0
      ? { ...track, duration: loadedDuration }
      : track,
  )

export type PlayerFeed = {
  canPlay: boolean
  duration: number
  isPlaying: boolean
  position: number
}

export const soundCloudPlayerFeed = (
  soundCloud: { duration: number; position: number; status: SoundCloudStatus },
  hasTrack: boolean,
): PlayerFeed => ({
  canPlay:
    (soundCloud.status.phase === 'playing' ||
      soundCloud.status.phase === 'ready') &&
    hasTrack,
  duration: soundCloud.duration,
  isPlaying: soundCloud.status.phase === 'playing',
  position: soundCloud.position,
})

export const bundledPlaylistFailure = (error: unknown): string => {
  if (error instanceof HTTPError) {
    return `The default playlist could not be loaded (${error.response.status}).`
  }
  return error instanceof Error
    ? error.message
    : 'The default playlist could not be loaded.'
}

export const mergeBundledTracks = (
  current: LocalMusicTrack[],
  bundledTracks: LocalMusicTrack[],
): LocalMusicTrack[] =>
  uniqBy([...current, ...bundledTracks], (track) => track.id)

export const probeDuration = async (
  track: LocalMusicTrack,
): Promise<number | null> => {
  const probe = document.createElement('audio')
  probe.preload = 'metadata'

  const metadata = new Promise<number>((resolve) => {
    probe.addEventListener(
      'loadedmetadata',
      () =>
        resolve(
          Number.isFinite(probe.duration)
            ? Math.round(probe.duration * 1000)
            : 0,
        ),
      { once: true },
    )
  })
  const failure = new Promise<null>((resolve) => {
    probe.addEventListener('error', () => resolve(null), { once: true })
  })

  probe.src = track.src
  const duration = await Promise.race([metadata, failure])
  probe.removeAttribute('src')
  probe.load()
  return duration
}
