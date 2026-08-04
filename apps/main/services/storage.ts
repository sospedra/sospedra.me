export type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type StorageLoadStatus = 'ok' | 'missing' | 'invalid' | 'unavailable'

export type StorageLoadResult<T = unknown> =
  | { status: 'ok'; value: T }
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'unavailable' }

// localStorage access throws in private mode and sandboxed iframes
export const getBrowserStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const readJson = (
  storage: StorageLike | null,
  key: string,
): StorageLoadResult => {
  if (!storage) return { status: 'unavailable' }

  try {
    const raw = storage.getItem(key)
    if (raw === null) return { status: 'missing' }
    return { status: 'ok', value: JSON.parse(raw) }
  } catch {
    return { status: 'invalid' }
  }
}

export const writeJson = (
  storage: StorageLike | null,
  key: string,
  value: unknown,
) => {
  if (!storage) return false

  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const readLocalJson = (key: string): StorageLoadResult =>
  readJson(getBrowserStorage(), key)

export const writeLocalJson = (key: string, value: unknown): boolean =>
  writeJson(getBrowserStorage(), key, value)

export const readLocal = (key: string): string | null => {
  const storage = getBrowserStorage()
  if (!storage) return null

  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export const writeLocal = (key: string, value: string): boolean => {
  const storage = getBrowserStorage()
  if (!storage) return false

  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
