import type {
  Bazaar3IntegrationStallId,
  FloorIntegrationId,
  IntegrationPhase,
} from './integration-manifest'

/**
 * The desktop floors are districts, not themes applied to tenants.
 *
 * Palette values below are reserved for shared architecture and local light
 * receivers. They must never be applied as a filter over a stall sprite.
 */
export const DESKTOP_FLOOR_SYSTEM_IDS = [
  'archive-service',
  'workshop-media',
  'leisure-transit',
] as const

export type DesktopFloorSystemId = (typeof DESKTOP_FLOOR_SYSTEM_IDS)[number]

export type DesktopFloorIntegrationId = Extract<
  FloorIntegrationId,
  'archive-desktop' | 'workshop-desktop' | 'reclaimed-desktop'
>

export type FloorSystemPalette = Readonly<{
  void: string
  wallShadow: string
  wallMid: string
  floorShadow: string
  floorMid: string
  ironShadow: string
  ironMid: string
  ironEdge: string
  oxide: string
  oxideEdge: string
  seam: string
}>

export type FloorEnvironmentAsset = Readonly<{
  src: string
  sourceCanvas: Readonly<{
    width: 1248
    height: 597
  }>
  authoredPixelScale: 3
}>

export type FloorLightRole =
  | 'task'
  | 'hologram'
  | 'screen'
  | 'practical'
  | 'biological'
  | 'route'

export type FloorLightEmitter = Readonly<{
  id: string
  owner: Bazaar3IntegrationStallId
  role: FloorLightRole
  coreColor: string
  directColor: string
  spillColor: string
}>

export type PercentRect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type FloorReceiverSurface = 'wall' | 'floor' | 'beam' | 'service-line'

export type FloorReceiverShape =
  | 'wall-column'
  | 'wall-shelf'
  | 'floor-pool'
  | 'beam-kiss'
  | 'floor-trace'

export type FloorLightReceiver = Readonly<{
  id: string
  emitterId: FloorLightEmitter['id']
  owner: Bazaar3IntegrationStallId
  phase: Extract<IntegrationPhase, 'light' | 'caster'>
  surface: FloorReceiverSurface
  shape: FloorReceiverShape
  rect: PercentRect
  mirrorX?: boolean
}>

export type FloorPropRole = 'seam' | 'contact' | 'bridge'

export type FloorPropKind =
  | 'asset'
  | 'service-drop'
  | 'beam-clamp'
  | 'wall-ledger'
  | 'floor-trench'
  | 'threshold-plate'
  | 'crate-stack'
  | 'bay-recess'
  | 'server-bank'
  | 'rug-extension'
  | 'cable-run'
  | 'drain-channel'
  | 'route-rail'

export type FloorPropTone = 'iron' | 'oxide' | 'floor' | 'void'

type FloorSystemPropBase = Readonly<{
  id: string
  role: FloorPropRole
  tone: FloorPropTone
  phase: Extract<IntegrationPhase, 'rear' | 'mid' | 'contact'>
  rect: PercentRect
  owner?: Bazaar3IntegrationStallId
  mirrorX?: boolean
}>

export type FloorSystemProp =
  | (FloorSystemPropBase &
      Readonly<{
        kind: 'asset'
        asset: Readonly<{
          src: string
          sourceCanvas: Readonly<{
            width: number
            height: number
          }>
        }>
      }>)
  | (FloorSystemPropBase &
      Readonly<{
        kind: Exclude<FloorPropKind, 'asset'>
        asset?: never
      }>)

export type FloorSystemAsset = Readonly<{
  src: string
  sourceCanvas: Readonly<{
    width: number
    height: number
  }>
}>

export type DesktopFloorSystem = Readonly<{
  id: DesktopFloorSystemId
  integrationId: DesktopFloorIntegrationId
  label: string
  thesis: string
  tenants: readonly Bazaar3IntegrationStallId[]
  environment: FloorEnvironmentAsset
  palette: FloorSystemPalette
  emitters: readonly FloorLightEmitter[]
  receivers: readonly FloorLightReceiver[]
  props: readonly FloorSystemProp[]
}>

function defineDesktopFloorSystem<const T extends DesktopFloorSystem>(
  spec: T,
): T {
  return spec
}

/**
 * Floor 1: a severe service counter sharing a quiet records basement.
 * Warm task light and cold hologram light remain visibly separate.
 */
const archiveService = defineDesktopFloorSystem({
  id: 'archive-service',
  integrationId: 'archive-desktop',
  label: 'Archive / service',
  thesis:
    'Oxblood service iron and blue-black archive cabinets share one municipal basement without mixing the ramen and hologram light.',
  tenants: ['uses', 'papers'],
  environment: {
    src: '/images/bazaar3/assets/environment/archive.png',
    sourceCanvas: { width: 1248, height: 597 },
    authoredPixelScale: 3,
  },
  palette: {
    void: '#020307',
    wallShadow: '#111923',
    wallMid: '#1c2731',
    floorShadow: '#1c2731',
    floorMid: '#2b3741',
    ironShadow: '#080c12',
    ironMid: '#2b3741',
    ironEdge: '#606970',
    oxide: '#6b391c',
    oxideEdge: '#bd7133',
    seam: '#111923',
  },
  emitters: [
    {
      id: 'uses-task',
      owner: 'uses',
      role: 'task',
      coreColor: '#ffd26b',
      directColor: '#df9e32',
      spillColor: '#ad6a1e',
    },
    {
      id: 'papers-hologram',
      owner: 'papers',
      role: 'hologram',
      coreColor: '#8be9e7',
      directColor: '#4bd2e1',
      spillColor: '#126e9b',
    },
  ],
  receivers: [
    {
      id: 'uses-wall',
      emitterId: 'uses-task',
      owner: 'uses',
      phase: 'light',
      surface: 'wall',
      shape: 'wall-column',
      rect: { x: 20, y: 28, width: 30, height: 38 },
    },
    {
      id: 'uses-counter-return',
      emitterId: 'uses-task',
      owner: 'uses',
      phase: 'light',
      surface: 'wall',
      shape: 'wall-shelf',
      rect: { x: 25, y: 48, width: 24, height: 14 },
    },
    {
      id: 'uses-floor',
      emitterId: 'uses-task',
      owner: 'uses',
      phase: 'caster',
      surface: 'floor',
      shape: 'floor-pool',
      rect: { x: 18, y: 72, width: 38, height: 14 },
    },
    {
      id: 'papers-wall',
      emitterId: 'papers-hologram',
      owner: 'papers',
      phase: 'light',
      surface: 'wall',
      shape: 'wall-column',
      rect: { x: 58, y: 25, width: 25, height: 42 },
    },
    {
      id: 'papers-floor',
      emitterId: 'papers-hologram',
      owner: 'papers',
      phase: 'caster',
      surface: 'floor',
      shape: 'floor-pool',
      rect: { x: 57, y: 73, width: 30, height: 13 },
    },
    {
      id: 'papers-beam',
      emitterId: 'papers-hologram',
      owner: 'papers',
      phase: 'light',
      surface: 'beam',
      shape: 'beam-kiss',
      rect: { x: 59, y: 19, width: 25, height: 3 },
    },
  ],
  props: [
    {
      id: 'archive-ramen-service-pipe',
      role: 'bridge',
      kind: 'asset',
      tone: 'iron',
      phase: 'rear',
      rect: { x: 8, y: 18, width: 15, height: 58 },
      owner: 'uses',
      asset: {
        src: '/images/bazaar3/assets/props-v3/ramen-service-pipe.png',
        sourceCanvas: { width: 252, height: 354 },
      },
    },
    {
      id: 'archive-return-cart',
      role: 'contact',
      kind: 'asset',
      tone: 'oxide',
      phase: 'mid',
      rect: { x: 47, y: 65, width: 19, height: 25 },
      asset: {
        src: '/images/bazaar3/assets/props-v3/archive-return-cart.png',
        sourceCanvas: { width: 288, height: 216 },
      },
    },
    {
      id: 'archive-tube-bundle',
      role: 'bridge',
      kind: 'asset',
      tone: 'iron',
      phase: 'rear',
      rect: { x: 59, y: 45, width: 24, height: 14 },
      owner: 'papers',
      asset: {
        src: '/images/bazaar3/assets/props-v3/archive-tube-bundle.png',
        sourceCanvas: { width: 300, height: 162 },
      },
    },
    {
      id: 'archive-service-drop',
      role: 'bridge',
      kind: 'service-drop',
      tone: 'oxide',
      phase: 'rear',
      rect: { x: 10, y: 2, width: 2.2, height: 55 },
      owner: 'uses',
    },
    {
      id: 'archive-ledger',
      role: 'bridge',
      kind: 'wall-ledger',
      tone: 'iron',
      phase: 'rear',
      rect: { x: 61, y: 43, width: 24, height: 5 },
      owner: 'papers',
    },
    {
      id: 'archive-center-clamp',
      role: 'seam',
      kind: 'beam-clamp',
      tone: 'oxide',
      phase: 'mid',
      rect: { x: 56.2, y: 4, width: 2.8, height: 9 },
    },
    {
      id: 'archive-floor-trench',
      role: 'seam',
      kind: 'floor-trench',
      tone: 'iron',
      phase: 'contact',
      rect: { x: 7, y: 82, width: 82, height: 5 },
    },
    {
      id: 'uses-threshold',
      role: 'contact',
      kind: 'threshold-plate',
      tone: 'oxide',
      phase: 'contact',
      rect: { x: 20, y: 90, width: 32, height: 5 },
      owner: 'uses',
    },
    {
      id: 'papers-cable',
      role: 'contact',
      kind: 'cable-run',
      tone: 'iron',
      phase: 'contact',
      rect: { x: 67, y: 86, width: 20, height: 8 },
      owner: 'papers',
    },
  ],
} satisfies DesktopFloorSystem)

/**
 * Floor 2: active repair, neglected compute, and tired media rental.
 * The common structure is workshop iron; each tenant keeps its own light.
 */
const workshopMedia = defineDesktopFloorSystem({
  id: 'workshop-media',
  integrationId: 'workshop-desktop',
  label: 'Workshop / media',
  thesis:
    'Dense service infrastructure stitches three incompatible work habits together: ordered repair, dark compute clutter, and warm CRT rental.',
  tenants: ['manual', 'console', 'talks'],
  environment: {
    src: '/images/bazaar3/assets/environment/workshop.png',
    sourceCanvas: { width: 1248, height: 597 },
    authoredPixelScale: 3,
  },
  palette: {
    void: '#020307',
    wallShadow: '#080c12',
    wallMid: '#1c2731',
    floorShadow: '#1c2731',
    floorMid: '#2b3741',
    ironShadow: '#080c12',
    ironMid: '#2b3741',
    ironEdge: '#606970',
    oxide: '#6b391c',
    oxideEdge: '#bd7133',
    seam: '#111923',
  },
  emitters: [
    {
      id: 'manual-task',
      owner: 'manual',
      role: 'task',
      coreColor: '#ffd26b',
      directColor: '#df9e32',
      spillColor: '#ad6a1e',
    },
    {
      id: 'console-screen',
      owner: 'console',
      role: 'screen',
      coreColor: '#8be9e7',
      directColor: '#56b4a4',
      spillColor: '#165652',
    },
    {
      id: 'talks-crt',
      owner: 'talks',
      role: 'screen',
      coreColor: '#8be9e7',
      directColor: '#4bd2e1',
      spillColor: '#126e9b',
    },
  ],
  receivers: [
    {
      id: 'manual-wall',
      emitterId: 'manual-task',
      owner: 'manual',
      phase: 'light',
      surface: 'wall',
      shape: 'wall-column',
      rect: { x: 17, y: 25, width: 27, height: 42 },
    },
    {
      id: 'manual-floor',
      emitterId: 'manual-task',
      owner: 'manual',
      phase: 'caster',
      surface: 'floor',
      shape: 'floor-pool',
      rect: { x: 14, y: 73, width: 32, height: 13 },
    },
    {
      id: 'console-wall',
      emitterId: 'console-screen',
      owner: 'console',
      phase: 'light',
      surface: 'wall',
      shape: 'wall-shelf',
      rect: { x: 43, y: 41, width: 23, height: 25 },
    },
    {
      id: 'console-floor',
      emitterId: 'console-screen',
      owner: 'console',
      phase: 'caster',
      surface: 'floor',
      shape: 'floor-pool',
      rect: { x: 41, y: 75, width: 28, height: 12 },
    },
    {
      id: 'talks-wall',
      emitterId: 'talks-crt',
      owner: 'talks',
      phase: 'light',
      surface: 'wall',
      shape: 'wall-column',
      rect: { x: 68, y: 25, width: 25, height: 40 },
    },
    {
      id: 'talks-floor',
      emitterId: 'talks-crt',
      owner: 'talks',
      phase: 'caster',
      surface: 'floor',
      shape: 'floor-pool',
      rect: { x: 66, y: 74, width: 29, height: 13 },
    },
    {
      id: 'workshop-service-line',
      emitterId: 'manual-task',
      owner: 'manual',
      phase: 'light',
      surface: 'service-line',
      shape: 'floor-trace',
      rect: { x: 18, y: 83, width: 72, height: 2 },
    },
  ],
  props: [
    {
      id: 'manual-scrap-crates',
      role: 'contact',
      kind: 'asset',
      tone: 'oxide',
      phase: 'mid',
      rect: { x: 14, y: 62, width: 21, height: 27 },
      owner: 'manual',
      asset: {
        src: '/images/bazaar3/assets/props-v3/manual-scrap-crates.png',
        sourceCanvas: { width: 384, height: 273 },
      },
    },
    {
      id: 'server-cable-tray',
      role: 'bridge',
      kind: 'asset',
      tone: 'void',
      phase: 'rear',
      rect: { x: 43, y: 25, width: 23, height: 15 },
      owner: 'console',
      asset: {
        src: '/images/bazaar3/assets/props-v3/server-cable-tray.png',
        sourceCanvas: { width: 396, height: 198 },
      },
    },
    {
      id: 'vhs-return-stack',
      role: 'contact',
      kind: 'asset',
      tone: 'iron',
      phase: 'mid',
      rect: { x: 75, y: 62, width: 15, height: 26 },
      owner: 'talks',
      asset: {
        src: '/images/bazaar3/assets/props-v3/vhs-return-stack.png',
        sourceCanvas: { width: 246, height: 231 },
      },
    },
    {
      id: 'console-dark-bay',
      role: 'bridge',
      kind: 'bay-recess',
      tone: 'void',
      phase: 'rear',
      rect: { x: 41.7, y: 26, width: 25.5, height: 52 },
      owner: 'console',
    },
    {
      id: 'console-left-server',
      role: 'bridge',
      kind: 'server-bank',
      tone: 'iron',
      phase: 'rear',
      rect: { x: 42.5, y: 34, width: 6.2, height: 41 },
      owner: 'console',
    },
    {
      id: 'console-right-server',
      role: 'bridge',
      kind: 'server-bank',
      tone: 'iron',
      phase: 'rear',
      rect: { x: 60.7, y: 32, width: 6.2, height: 43 },
      owner: 'console',
      mirrorX: true,
    },
    {
      id: 'console-rug-extension',
      role: 'contact',
      kind: 'rug-extension',
      tone: 'oxide',
      phase: 'contact',
      rect: { x: 43.2, y: 76, width: 22.4, height: 13 },
      owner: 'console',
    },
    {
      id: 'workshop-left-drop',
      role: 'bridge',
      kind: 'service-drop',
      tone: 'iron',
      phase: 'rear',
      rect: { x: 14, y: 2, width: 2.4, height: 58 },
      owner: 'manual',
    },
    {
      id: 'workshop-manual-console-clamp',
      role: 'seam',
      kind: 'beam-clamp',
      tone: 'oxide',
      phase: 'mid',
      rect: { x: 42.2, y: 4, width: 3, height: 10 },
    },
    {
      id: 'workshop-console-talks-clamp',
      role: 'seam',
      kind: 'beam-clamp',
      tone: 'oxide',
      phase: 'mid',
      rect: { x: 66, y: 4, width: 3, height: 10 },
    },
    {
      id: 'workshop-cable-trench',
      role: 'seam',
      kind: 'floor-trench',
      tone: 'iron',
      phase: 'contact',
      rect: { x: 11, y: 84, width: 83, height: 5 },
    },
    {
      id: 'manual-parts-crates',
      role: 'contact',
      kind: 'crate-stack',
      tone: 'oxide',
      phase: 'mid',
      rect: { x: 13, y: 66, width: 9, height: 14 },
      owner: 'manual',
    },
    {
      id: 'console-cable-run',
      role: 'contact',
      kind: 'cable-run',
      tone: 'void',
      phase: 'contact',
      rect: { x: 44, y: 86, width: 23, height: 8 },
      owner: 'console',
    },
    {
      id: 'talks-threshold',
      role: 'contact',
      kind: 'threshold-plate',
      tone: 'iron',
      phase: 'contact',
      rect: { x: 71, y: 90, width: 19, height: 5 },
      owner: 'talks',
    },
  ],
} satisfies DesktopFloorSystem)

/**
 * Floor 3: reclaimed utility garden, kid-built play stall, and transit desk.
 * Growth, cheap plastic/wood, and aerospace violet stay distinct.
 */
const leisureTransit = defineDesktopFloorSystem({
  id: 'leisure-transit',
  integrationId: 'reclaimed-desktop',
  label: 'Leisure / transit',
  thesis:
    'A damp reclaimed concourse connects a living project garden to improvised play and an old interplanetary departure desk.',
  tenants: ['projects', 'games', 'travel'],
  environment: {
    src: '/images/bazaar3/assets/environment/reclaimed.png',
    sourceCanvas: { width: 1248, height: 597 },
    authoredPixelScale: 3,
  },
  palette: {
    void: '#020307',
    wallShadow: '#111923',
    wallMid: '#0e3534',
    floorShadow: '#1c2731',
    floorMid: '#2b3741',
    ironShadow: '#080c12',
    ironMid: '#2b3741',
    ironEdge: '#606970',
    oxide: '#ad6744',
    oxideEdge: '#efbd82',
    seam: '#111923',
  },
  emitters: [
    {
      id: 'projects-biological',
      owner: 'projects',
      role: 'biological',
      coreColor: '#ffd26b',
      directColor: '#df9e32',
      spillColor: '#ad6a1e',
    },
    {
      id: 'games-screen',
      owner: 'games',
      role: 'screen',
      coreColor: '#8be9e7',
      directColor: '#4bd2e1',
      spillColor: '#126e9b',
    },
    {
      id: 'travel-route',
      owner: 'travel',
      role: 'route',
      coreColor: '#ffd26b',
      directColor: '#df9e32',
      spillColor: '#ad6a1e',
    },
  ],
  receivers: [
    {
      id: 'projects-wall',
      emitterId: 'projects-biological',
      owner: 'projects',
      phase: 'light',
      surface: 'wall',
      shape: 'beam-kiss',
      rect: { x: 18, y: 39, width: 25, height: 5 },
    },
    {
      id: 'projects-floor',
      emitterId: 'projects-biological',
      owner: 'projects',
      phase: 'caster',
      surface: 'floor',
      shape: 'floor-pool',
      rect: { x: 13, y: 73, width: 35, height: 13 },
    },
    {
      id: 'games-wall',
      emitterId: 'games-screen',
      owner: 'games',
      phase: 'light',
      surface: 'wall',
      shape: 'wall-shelf',
      rect: { x: 43, y: 43, width: 24, height: 23 },
    },
    {
      id: 'games-floor',
      emitterId: 'games-screen',
      owner: 'games',
      phase: 'caster',
      surface: 'floor',
      shape: 'floor-pool',
      rect: { x: 42, y: 76, width: 26, height: 11 },
    },
    {
      id: 'travel-wall',
      emitterId: 'travel-route',
      owner: 'travel',
      phase: 'light',
      surface: 'wall',
      shape: 'wall-column',
      rect: { x: 68, y: 24, width: 26, height: 42 },
    },
    {
      id: 'travel-floor',
      emitterId: 'travel-route',
      owner: 'travel',
      phase: 'caster',
      surface: 'floor',
      shape: 'floor-pool',
      rect: { x: 65, y: 74, width: 31, height: 13 },
    },
    {
      id: 'travel-route-trace',
      emitterId: 'travel-route',
      owner: 'travel',
      phase: 'light',
      surface: 'service-line',
      shape: 'floor-trace',
      rect: { x: 68, y: 84, width: 28, height: 2 },
    },
  ],
  props: [
    {
      id: 'reclaimed-root-drain',
      role: 'contact',
      kind: 'asset',
      tone: 'void',
      phase: 'contact',
      rect: { x: 11, y: 80, width: 30, height: 14 },
      owner: 'projects',
      asset: {
        src: '/images/bazaar3/assets/props-v3/root-drain.png',
        sourceCanvas: { width: 462, height: 147 },
      },
    },
    {
      id: 'games-stock-crates',
      role: 'contact',
      kind: 'asset',
      tone: 'oxide',
      phase: 'mid',
      rect: { x: 43, y: 61, width: 22, height: 28 },
      owner: 'games',
      asset: {
        src: '/images/bazaar3/assets/props-v3/games-stock-crates.png',
        sourceCanvas: { width: 402, height: 276 },
      },
    },
    {
      id: 'travel-queue-posts',
      role: 'contact',
      kind: 'asset',
      tone: 'iron',
      phase: 'mid',
      rect: { x: 72, y: 61, width: 23, height: 29 },
      owner: 'travel',
      asset: {
        src: '/images/bazaar3/assets/props-v3/travel-queue-posts.png',
        sourceCanvas: { width: 432, height: 297 },
      },
    },
    {
      id: 'reclaimed-irrigation-drop',
      role: 'bridge',
      kind: 'service-drop',
      tone: 'oxide',
      phase: 'rear',
      rect: { x: 12, y: 2, width: 2.5, height: 62 },
      owner: 'projects',
    },
    {
      id: 'reclaimed-projects-ledger',
      role: 'bridge',
      kind: 'wall-ledger',
      tone: 'iron',
      phase: 'rear',
      rect: { x: 16, y: 55, width: 27, height: 5 },
      owner: 'projects',
    },
    {
      id: 'reclaimed-first-clamp',
      role: 'seam',
      kind: 'beam-clamp',
      tone: 'oxide',
      phase: 'mid',
      rect: { x: 42.4, y: 4, width: 3, height: 10 },
    },
    {
      id: 'reclaimed-second-clamp',
      role: 'seam',
      kind: 'beam-clamp',
      tone: 'oxide',
      phase: 'mid',
      rect: { x: 66.5, y: 4, width: 3, height: 10 },
    },
    {
      id: 'reclaimed-drain',
      role: 'seam',
      kind: 'drain-channel',
      tone: 'void',
      phase: 'contact',
      rect: { x: 9, y: 85, width: 60, height: 5 },
    },
    {
      id: 'games-cable',
      role: 'contact',
      kind: 'cable-run',
      tone: 'iron',
      phase: 'contact',
      rect: { x: 45, y: 87, width: 21, height: 7 },
      owner: 'games',
    },
    {
      id: 'travel-route-rail',
      role: 'contact',
      kind: 'route-rail',
      tone: 'iron',
      phase: 'contact',
      rect: { x: 68, y: 88, width: 25, height: 6 },
      owner: 'travel',
    },
  ],
} satisfies DesktopFloorSystem)

export const DESKTOP_FLOOR_SYSTEMS: Readonly<
  Record<DesktopFloorSystemId, DesktopFloorSystem>
> = {
  'archive-service': archiveService,
  'workshop-media': workshopMedia,
  'leisure-transit': leisureTransit,
}

const FLOOR_SYSTEM_BY_INTEGRATION_ID: Readonly<
  Partial<Record<FloorIntegrationId, DesktopFloorSystem>>
> = {
  'archive-desktop': archiveService,
  'workshop-desktop': workshopMedia,
  'reclaimed-desktop': leisureTransit,
}

export function getDesktopFloorSystem(
  integrationId: FloorIntegrationId,
): DesktopFloorSystem | null {
  return FLOOR_SYSTEM_BY_INTEGRATION_ID[integrationId] ?? null
}

export function getFloorSystemAssetUrls(): string[] {
  return [
    ...new Set(
      Object.values(DESKTOP_FLOOR_SYSTEMS).flatMap((system) => [
        system.environment.src,
        ...system.props.flatMap((prop) =>
          prop.kind === 'asset' ? [prop.asset.src] : [],
        ),
      ]),
    ),
  ]
}
