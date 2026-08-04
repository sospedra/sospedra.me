import type {
  CSSProperties,
  KeyboardEventHandler,
  PointerEventHandler,
  RefCallback,
} from 'react'

type MusicTrackBase = {
  album: string
  artist: string
  duration: number
  id: string
  title: string
  type: string
}

export type LocalMusicTrack = MusicTrackBase & {
  kind: 'local'
  src: string
}

export type SoundCloudMusicTrack = MusicTrackBase & {
  kind: 'soundcloud'
  permalink: string
  soundIndex: number
}

export type MusicTrack = LocalMusicTrack | SoundCloudMusicTrack

export type DragPanelProps = {
  'aria-label': string
  'aria-roledescription': string
  'data-dragging': boolean
  onKeyDown: KeyboardEventHandler<HTMLElement>
  onLostPointerCapture: PointerEventHandler<HTMLElement>
  onPointerCancel: PointerEventHandler<HTMLElement>
  onPointerDown: PointerEventHandler<HTMLElement>
  onPointerMove: PointerEventHandler<HTMLElement>
  onPointerUp: PointerEventHandler<HTMLElement>
  ref: RefCallback<HTMLElement>
  style: CSSProperties
  tabIndex: number
}

export type WinampPanelId = 'equalizer' | 'player' | 'tracklist'
export type WinampPanelVisibility = Record<WinampPanelId, boolean>
