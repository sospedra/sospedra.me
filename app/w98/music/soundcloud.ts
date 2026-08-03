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

const WWW_HOST_PREFIX = /^www\./
const NUMERIC_PLAYLIST_ID = /^\d+$/
const SET_PERMALINK_PATH = /^\/[^/]+\/sets\/[^/]+\/?$/
const API_PLAYLIST_PATH = /^\/playlists\/(?:soundcloud:playlists:)?\d+\/?$/

export type SoundCloudPlaylistResult =
  | { ok: false; reason: string }
  | { ok: true; playlist: string }

type ParsedWebUrl = { ok: false; reason: string } | { ok: true; url: URL }

const cleanHost = (hostname: string): string =>
  hostname.toLowerCase().replace(WWW_HOST_PREFIX, '')

const attemptUrl = (value: string): URL | null => {
  try {
    return new URL(value.startsWith('//') ? `https:${value}` : value)
  } catch {
    return null
  }
}

const parseWebUrl = (value: string): ParsedWebUrl => {
  const url = attemptUrl(value)
  if (!url) {
    return { ok: false, reason: 'Use a valid SoundCloud playlist link.' }
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return {
      ok: false,
      reason: 'Use an HTTP or HTTPS SoundCloud playlist link.',
    }
  }
  return { ok: true, url }
}

const embeddedIframeSrc = (markup: string): string =>
  new DOMParser()
    .parseFromString(markup, 'text/html')
    .querySelector('iframe')
    ?.getAttribute('src') ?? ''

const resolveWidgetSource = (url: URL): ParsedWebUrl => {
  if (cleanHost(url.hostname) !== 'w.soundcloud.com') return { ok: true, url }
  const nested = url.searchParams.get('url')
  if (!nested) {
    return { ok: false, reason: 'That embed has no SoundCloud source.' }
  }
  return parseWebUrl(nested)
}

const isPlaylistUrl = (url: URL): boolean => {
  const host = cleanHost(url.hostname)
  const path = decodeURIComponent(url.pathname)
  if (host === 'soundcloud.com') return SET_PERMALINK_PATH.test(path)
  if (host === 'api.soundcloud.com') return API_PLAYLIST_PATH.test(path)
  return false
}

export const normalizeSoundCloudPlaylist = (
  raw: string,
): SoundCloudPlaylistResult => {
  const input = raw.trim()
  if (!input) return { ok: false, reason: 'Paste a SoundCloud playlist first.' }
  if (NUMERIC_PLAYLIST_ID.test(input)) {
    return {
      ok: true,
      playlist: `https://api.soundcloud.com/playlists/${input}`,
    }
  }

  const embedSrc = input.startsWith('<') ? embeddedIframeSrc(input) : input
  const direct = parseWebUrl(embedSrc.replaceAll('&amp;', '&'))
  if (!direct.ok) return direct
  const resolved = resolveWidgetSource(direct.url)
  if (!resolved.ok) return resolved
  if (!isPlaylistUrl(resolved.url)) {
    return { ok: false, reason: 'Use a public SoundCloud playlist or set URL.' }
  }

  const playlist = new URL(resolved.url)
  playlist.protocol = 'https:'
  playlist.search = ''
  playlist.hash = ''
  return { ok: true, playlist: playlist.toString() }
}
