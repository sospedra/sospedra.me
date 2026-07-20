// fnv-1a: folds a seed string into a 32-bit prng state
const hashSeed = (seed: string) => {
  let hash = 0x811c9dc5
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// mulberry32, constant seed: server html and client hydration
// must draw identical values
export const createRng = (seed = 'sospedra.me') => {
  let state = hashSeed(seed)

  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const createRange = (rng = createRng()) => {
  return (max = 1, min = 0) => Math.floor(rng() * (max - min + 1)) + min
}
