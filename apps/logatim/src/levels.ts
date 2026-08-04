import {
  LEVEL_NAMES,
  LEVELS,
  type LevelName,
  STORAGE_KEY,
} from './constants.ts'
import { attempt, attemptGet } from './utils.ts'

export const levelNameOf = (level: number): LevelName => LEVEL_NAMES[level]

const resolveLevelNumber = (level: string | number): number | undefined => {
  if (typeof level === 'number') return level

  const name = level.toUpperCase()
  return Object.hasOwn(LEVELS, name) ? LEVELS[name as LevelName] : undefined
}

export const parseLevel = (level: string | number): number => {
  const resolved = resolveLevelNumber(level)

  if (resolved === undefined || resolved < 0 || resolved > LEVELS.SILENT) {
    throw new Error(`logatim.setLevel() called with invalid level: ${level}`)
  }

  return resolved
}

const cookieMarker = () => `${encodeURIComponent(STORAGE_KEY)}=`

export const persistLevel = (level: number, isNode: boolean): void => {
  if (isNode || typeof window === 'undefined') return

  const name = levelNameOf(level)
  attempt(() => window.localStorage.setItem(STORAGE_KEY, name))
  attempt(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: session-cookie fallback for storage-less browsers
    window.document.cookie = `${cookieMarker()}${name};`
  })
}

const readCookieLevel = (): string | undefined => {
  const cookie = window.document.cookie
  const start = cookie.indexOf(cookieMarker())

  if (start < 0) return undefined
  return cookie.slice(start + cookieMarker().length).split(';')[0]
}

export const readPersistedLevel = (fallback: number): string | number => {
  if (typeof window === 'undefined') return fallback

  const stored =
    attemptGet(() => window.localStorage.getItem(STORAGE_KEY) ?? undefined) ??
    attemptGet(readCookieLevel)

  if (stored === undefined || !Object.hasOwn(LEVELS, stored)) return fallback
  return stored
}
