import { getFloorSystemAssetUrls } from './floor-system-manifest'
import { getIntegrationAssetUrls } from './integration-manifest'

/* Switched family-by-family as verified Bazaar3 assets are promoted. */
const ASSETS = '/images/bazaar2/assets'
const STREET = '/images/bazaar2/assets/street2'
const ARCHITECTURE = '/images/bazaar3/assets/architecture'
const STALLS = '/images/bazaar3/assets/stalls'

const ANIMATED_STALL_IDS = [
  'uses',
  'papers',
  'games',
  'talks',
  'manual',
  'console',
  'projects',
  'travel',
] as const
const V2_STALL_IDS = new Set(['console', 'projects', 'travel'])
const stallFrameRoot = (id: (typeof ANIMATED_STALL_IDS)[number]) =>
  `${STALLS}/${
    id === 'manual' ? 'manual-v3' : V2_STALL_IDS.has(id) ? `${id}-v2` : id
  }/frames`

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
    `${stallFrameRoot(id)}/idle-1.png`,
    `${stallFrameRoot(id)}/idle-2.png`,
    ...[1, 2, 3].map((n) => `${stallFrameRoot(id)}/hover-${n}.png`),
  ])
  const architecture = [
    ...[1, 2, 3].map((n) => `${ARCHITECTURE}/desktop-core-${n}.png`),
    `${ARCHITECTURE}/desktop-core-2-workshop.png`,
    ...['core', 'platform', 'deck', 'fascia', 'underside'].map(
      (part) => `${ARCHITECTURE}/mobile-${part}.png`,
    ),
    ...['horizontal', 'vertical', 'joint'].map(
      (part) => `${ARCHITECTURE}/h-beam-${part}.png`,
    ),
  ]
  return [
    ...animatedStalls,
    ...[1, 2, 3].map((n) => `${ASSETS}/mkt-env-${n}.png`),
    ...architecture,
    ...['pipes', 'cables-a', 'cables-b'].flatMap((k) => [
      `${ASSETS}/slabs/slab-${k}.png`,
      `${ASSETS}/slabs/slab-${k}-bg.png`,
    ]),
    `${ASSETS}/wayfinding/sign-up.png`,
    `${ASSETS}/wayfinding/sign-down.png`,
    ...getFloorSystemAssetUrls(),
    ...getIntegrationAssetUrls(),
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
