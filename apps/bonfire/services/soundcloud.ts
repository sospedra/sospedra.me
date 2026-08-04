export const DEFAULT_PLAYLIST_ID = '1201400941'

export const SOUNDCLOUD_WIDGET_SCRIPT = 'https://w.soundcloud.com/player/api.js'

export const playlistEmbedUrl = (playlistID: string): string => {
  return `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/${playlistID}&color=%230c1c04&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`
}

export const parsePlaylistID = (embedOrID: string): string | null => {
  if (!embedOrID.includes('http')) return embedOrID
  const id = embedOrID.split('playlists/')[1]?.split('&')[0]
  return id ?? null
}

export type SoundCloudSound = {
  duration?: number
  title?: string
}

export type SoundCloudProgress = {
  currentPosition: number
  relativePosition: number
}

export type SoundCloudWidget = {
  bind: (
    event: string,
    listener: (payload?: SoundCloudProgress) => void,
  ) => void
  getCurrentSound: (callback: (sound: SoundCloudSound) => void) => void
  pause: () => void
  play: () => void
  unbind: (event: string) => void
}

type SoundCloudEvents = {
  PAUSE: string
  PLAY: string
  PLAY_PROGRESS: string
  READY: string
}

type SoundCloudWidgetFactory = {
  (element: HTMLIFrameElement): SoundCloudWidget
  Events: SoundCloudEvents
}

declare global {
  // biome-ignore lint/style/useConsistentTypeDefinitions: augmenting Window needs declaration merging
  interface Window {
    SC?: {
      Widget: SoundCloudWidgetFactory
    }
  }
}
