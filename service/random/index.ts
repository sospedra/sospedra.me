import seedrandom from 'seedrandom'

export const createRng = (now = new Date()) => {
  return seedrandom((now.getTime() / 1000000).toFixed())
}

export const createRange = (rng = createRng()) => {
  return (max = 1, min = 0) => Math.floor(rng.quick() * (max - min + 1)) + min
}
