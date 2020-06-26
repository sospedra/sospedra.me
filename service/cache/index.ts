export const createCache = <E, R>(memo: (element: E) => R) => {
  const cache = new Map<E, R>()

  const get = (element: E) => {
    const memoized = cache.get(element)

    if (memoized) {
      return memoized
    } else {
      const result = memo(element)
      cache.set(element, result)
      return result
    }
  }

  const clear = () => {
    cache.clear()
  }

  return { get, clear }
}
