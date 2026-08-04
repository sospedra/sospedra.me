const MAX_LEGACY_KEY_CODE = 255
const MAX_HUE = 360

export const hueFor = (which: number): number =>
  (which / MAX_LEGACY_KEY_CODE) * MAX_HUE

export const backgroundFor = (which: number): string =>
  `hsl(${hueFor(which)}, 35%, 50%)`
