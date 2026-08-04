const holdForever = new Promise<never>(() => {})

export const claimTabOwnership = (lockName: string): Promise<boolean> =>
  new Promise((resolve) => {
    void navigator.locks.request(lockName, { ifAvailable: true }, (lock) => {
      resolve(lock !== null)
      return lock === null ? Promise.resolve() : holdForever
    })
  })

export const awaitTabOwnership = (lockName: string): Promise<void> =>
  new Promise((resolve) => {
    void navigator.locks.request(lockName, () => {
      resolve()
      return holdForever
    })
  })
