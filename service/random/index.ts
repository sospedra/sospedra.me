import seedrandom from 'seedrandom'

// constant seed: server HTML and client hydration must draw identical values
export const createRng = (seed = 'sospedra.me') => {
  return seedrandom(seed)
}

export const createRange = (rng = createRng()) => {
  return (max = 1, min = 0) => Math.floor(rng.quick() * (max - min + 1)) + min
}
