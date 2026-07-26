const ASSETS = '/images/bazaar2/assets'
const STREET = `${ASSETS}/street2`

const STALL_IDS = [
  'uses',
  'games',
  'travel',
  'manual',
  'console',
  'projects',
  'talks',
  'papers',
] as const

/* papers is the hologram: no hover frames */
const HOVERLESS = new Set(['papers'])

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

const marketAssets = (bp: 'desktop' | 'mobile') => {
  const stalls = STALL_IDS.flatMap((id) => [
    `${ASSETS}/stall-${id}-${bp}-front.png`,
    `${ASSETS}/stall-${id}-${bp}-interior.png`,
    `${ASSETS}/stall-${id}-keeper-idle-1.png`,
    `${ASSETS}/stall-${id}-keeper-idle-2.png`,
    ...(HOVERLESS.has(id)
      ? []
      : [1, 2, 3].map((n) => `${ASSETS}/stall-${id}-keeper-hover-${n}.png`)),
  ])
  const stairs = [1, 2, 3].map((n) => `${ASSETS}/stairs-${n}.png`)
  return [
    ...stalls,
    `${ASSETS}/stall-manual-customer-idle-1.png`,
    `${ASSETS}/stall-manual-customer-idle-2.png`,
    ...[1, 2, 3].map((n) => `${ASSETS}/mkt-env-${n}.png`),
    ...stairs,
    ...[1, 2, 3].map((n) => `/images/bazaar/assets/slab-pipes-${n}.png`),
  ]
}

let started = false

/* warm the browser cache during the home drive: street first, floors after */
export function prefetchBazaarAssets() {
  if (started || typeof window === 'undefined') return
  started = true
  const bp = window.matchMedia('(max-width: 700px)').matches
    ? 'mobile'
    : 'desktop'
  for (const src of [...streetAssets(), ...marketAssets(bp)]) {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
  }
}
