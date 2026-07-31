export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type StorageLoadStatus = 'ok' | 'missing' | 'invalid' | 'unavailable'

export interface StorageLoadResult<T> {
  status: StorageLoadStatus
  value: T
}

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
): StorageLoadResult<unknown> => {
  if (!storage) return { status: 'unavailable', value: null }

  try {
    const raw = storage.getItem(key)
    if (raw === null) return { status: 'missing', value: null }
    return { status: 'ok', value: JSON.parse(raw) }
  } catch {
    return { status: 'invalid', value: null }
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

export const readLocalJson = (key: string): StorageLoadResult<unknown> =>
  readJson(getBrowserStorage(), key)

export const writeLocalJson = (key: string, value: unknown): boolean =>
  writeJson(getBrowserStorage(), key, value)

export const readLocal = (key: string): string | null => {
  try {
    return getBrowserStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

export const writeLocal = (key: string, value: string): boolean => {
  try {
    getBrowserStorage()?.setItem(key, value)
    return true
  } catch {
    return false
  }
}
