const DB_NAME = 'irc'
const STORE = 'kv'

const asPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

export const kvGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await openDb()
  const value = await asPromise<T | undefined>(
    db.transaction(STORE, 'readonly').objectStore(STORE).get(key),
  )
  db.close()
  return value
}

export const kvPut = async (key: string, value: unknown): Promise<void> => {
  const db = await openDb()
  await asPromise(
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key),
  )
  db.close()
}
