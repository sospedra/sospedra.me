const ASSETS = '/images/bazaar2/assets'
const STREET = `${ASSETS}/street2`

const ANIMATED_STALL_IDS = [
  'uses',
  'papers',
  'games',
  'talks',
  'manual',
] as const

const STATIC_STALL_ASSETS = [
  'stall-travel-baked',
  'stall-console-baked',
  'stall-projects-baked-v2',
] as const

const streetAssets = () => [
  `${STREET}/bg.png`,
  `${STREET}/building-a.png`,
  `${STREET}/building-cd.png`,
  `${STREET}/building-pad.png`,
  `${STREET}/bus.png`,
  `${STREET}/door.png`,
  `${STREET}/floor.png`,
  `${STREET}/neon.png`,
]

const marketAssets = () => {
  const animatedStalls = ANIMATED_STALL_IDS.flatMap((id) => [
    `${ASSETS}/stall-${id}-idle-1.png`,
    `${ASSETS}/stall-${id}-idle-2.png`,
    ...[1, 2, 3].map((n) => `${ASSETS}/stall-${id}-hover-${n}.png`),
  ])
  const staticStalls = STATIC_STALL_ASSETS.map(
    (asset) => `${ASSETS}/${asset}.png`,
  )
  const stairs = [1, 2, 3].map((n) => `${ASSETS}/stairs-${n}.png`)
  return [
    ...animatedStalls,
    ...staticStalls,
    ...[1, 2, 3].map((n) => `${ASSETS}/mkt-env-${n}.png`),
    ...stairs,
    ...['pipes', 'cables-a', 'cables-b'].flatMap((k) => [
      `/images/bazaar2/assets/slabs/slab-${k}.png`,
      `/images/bazaar2/assets/slabs/slab-${k}-bg.png`,
    ]),
    `${ASSETS}/wayfinding/sign-up.png`,
    `${ASSETS}/wayfinding/sign-down.png`,
  ]
}

let started = false

/* warm the browser cache during the home drive: street first, floors after */
export function prefetchBazaarAssets() {
  if (started || typeof window === 'undefined') return
  started = true
  for (const src of [...streetAssets(), ...marketAssets()]) {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
  }
}
