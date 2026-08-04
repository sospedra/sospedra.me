// fnv-1a: folds a string into a 32-bit integer
export const hashString = (value: string) => {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// mulberry32: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
export const mulberry32 = (seed: number) => {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// constant seed: server html and client hydration must draw identical values
export const createRng = (seed = 'sospedra.me') => mulberry32(hashString(seed))

export const createRange = (rng = createRng()) => {
  return (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
}

export const shuffleWith = <Value>(
  rng: () => number,
  values: readonly Value[],
): Value[] => {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}
