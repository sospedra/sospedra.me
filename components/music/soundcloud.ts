export const BONFIRE_PLAYLIST = 'https://soundcloud.com/sospedra/sets/bonfire'

export const SOUNDCLOUD_WIDGET_SCRIPT = 'https://w.soundcloud.com/player/api.js'

export type SoundCloudSound = {
  artwork_url?: string | null
  duration?: number
  id?: number
  permalink_url?: string
  title?: string
  urn?: string
  user?: {
    permalink_url?: string
    username?: string
  }
}

export type SoundCloudProgress = {
  currentPosition: number
  loadProgress: number
  relativePosition: number
}

export type SoundCloudWidget = {
  bind: (
    event: string,
    listener: (payload?: SoundCloudProgress) => void,
  ) => void
  getCurrentSound: (callback: (sound: SoundCloudSound) => void) => void
  getCurrentSoundIndex: (callback: (index: number) => void) => void
  getDuration: (callback: (duration: number) => void) => void
  getSounds: (callback: (sounds: SoundCloudSound[]) => void) => void
  load: (
    url: string,
    options: SoundCloudWidgetOptions & { callback?: () => void },
  ) => void
  next: () => void
  pause: () => void
  play: () => void
  prev: () => void
  seekTo: (milliseconds: number) => void
  setVolume: (volume: number) => void
  skip: (index: number) => void
  toggle: () => void
  unbind: (event: string) => void
}

type SoundCloudEvents = {
  ERROR: string
  FINISH: string
  PAUSE: string
  PLAY: string
  PLAY_PROGRESS: string
  READY: string
  SEEK: string
}

type SoundCloudWidgetFactory = {
  (element: HTMLIFrameElement): SoundCloudWidget
  Events: SoundCloudEvents
}

declare global {
  interface Window {
    SC?: {
      Widget: SoundCloudWidgetFactory
    }
  }
}

type SoundCloudWidgetOptions = {
  auto_play: boolean
  buying: boolean
  color: string
  download: boolean
  hide_related: boolean
  sharing: boolean
  show_artwork: boolean
  show_comments: boolean
  show_playcount: boolean
  show_reposts: boolean
  show_teaser: boolean
  show_user: boolean
  single_active: boolean
  visual: boolean
}

export const WIDGET_OPTIONS: SoundCloudWidgetOptions = {
  auto_play: false,
  buying: false,
  color: '#ff8b2d',
  download: false,
  hide_related: true,
  sharing: false,
  show_artwork: false,
  show_comments: false,
  show_playcount: false,
  show_reposts: false,
  show_teaser: false,
  show_user: false,
  single_active: true,
  visual: false,
}

export const soundCloudEmbedUrl = (playlist: string): string => {
  const params = new URLSearchParams({
    url: playlist,
    ...Object.fromEntries(
      Object.entries(WIDGET_OPTIONS).map(([key, value]) => [
        key,
        String(value),
      ]),
    ),
  })
  return `https://w.soundcloud.com/player/?${params.toString()}`
}

const cleanHost = (hostname: string): string =>
  hostname.toLowerCase().replace(/^www\./, '')

const asUrl = (value: string): URL => {
  try {
    const normalized = value.startsWith('//') ? `https:${value}` : value
    return new URL(normalized)
  } catch {
    throw new Error('Use a valid SoundCloud playlist link.')
  }
}

const asWebUrl = (value: string): URL => {
  const url = asUrl(value)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Use an HTTP or HTTPS SoundCloud playlist link.')
  }
  return url
}

export const normalizeSoundCloudPlaylist = (raw: string): string => {
  let value = raw.trim()
  if (!value) throw new Error('Paste a SoundCloud playlist first.')

  if (/^\d+$/.test(value)) {
    return `https://api.soundcloud.com/playlists/${value}`
  }

  if (value.startsWith('<')) {
    const documentNode = new DOMParser().parseFromString(value, 'text/html')
    value = documentNode.querySelector('iframe')?.getAttribute('src') ?? ''
  }

  let url = asWebUrl(value.replaceAll('&amp;', '&'))
  if (cleanHost(url.hostname) === 'w.soundcloud.com') {
    const nested = url.searchParams.get('url')
    if (!nested) throw new Error('That embed has no SoundCloud source.')
    url = asWebUrl(nested)
  }

  const host = cleanHost(url.hostname)
  const path = decodeURIComponent(url.pathname)
  const isPermalink =
    host === 'soundcloud.com' && /^\/[^/]+\/sets\/[^/]+\/?$/.test(path)
  const isApiPlaylist =
    host === 'api.soundcloud.com' &&
    /^\/playlists\/(?:soundcloud:playlists:)?\d+\/?$/.test(path)

  if (!isPermalink && !isApiPlaylist) {
    throw new Error('Use a public SoundCloud playlist or set URL.')
  }

  url.protocol = 'https:'
  url.search = ''
  url.hash = ''
  return url.toString()
}
