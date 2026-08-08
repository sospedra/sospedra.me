const STREET = '/images/bazaar/street'

/* the home entry warms these ahead of the drive; stall-data.test.ts
   asserts every path ships and floor 0 plates stay covered */
export const SKYLINE_WARM = [
  `${STREET}/bg.png`,
  `${STREET}/bg-tower.png`,
  `${STREET}/building-a.png`,
  `${STREET}/building-cd.png`,
  `${STREET}/building-pad.png`,
  `${STREET}/floor.png`,
]

export const STREET_WARM = [
  ...SKYLINE_WARM,
  `${STREET}/alley-signs-1.png`,
  `${STREET}/alley-signs-2.png`,
  `${STREET}/bus.png`,
  `${STREET}/bus-on.png`,
  `${STREET}/bus-post.png`,
  `${STREET}/bus-post-on.png`,
  `${STREET}/door.png`,
  `${STREET}/door-open-1.png`,
  `${STREET}/door-open-2.png`,
  `${STREET}/neon-off.png`,
  `${STREET}/neon.png`,
  `${STREET}/stairs-mobile.png`,
  '/images/bazaar/uses/plate-key.png',
  '/images/bazaar/map/plate-key.png',
]
