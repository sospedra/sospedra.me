/**
 * Typed runtime contract for Bazaar 3 environmental integration.
 *
 * The live route imports this manifest. `ready` variants are production-safe;
 * `prototype` variants are available only through the explicit Bazaar 3 QA
 * mode, and `legacy` variants always retain the approved fallback rendering.
 */

export const INTEGRATION_ASSET_ROOT =
  '/images/bazaar3/assets/integration' as const

export const INTEGRATION_PHASES = [
  'rear',
  'light',
  'mid',
  'caster',
  'contact',
  'front',
] as const

export type IntegrationPhase = (typeof INTEGRATION_PHASES)[number]
export type IntegrationBreakpoint = 'desktop' | 'mobile'
export type IntegrationStatus = 'legacy' | 'prototype' | 'ready'

export function canRenderIntegration(
  status: IntegrationStatus,
  qaMode = false,
): boolean {
  return status === 'ready' || (qaMode && status === 'prototype')
}

export type Bazaar3IntegrationStallId =
  | 'uses'
  | 'papers'
  | 'manual'
  | 'console'
  | 'talks'
  | 'projects'
  | 'games'
  | 'travel'

export const FLOOR_INTEGRATION_IDS = [
  'archive-desktop',
  'workshop-desktop',
  'reclaimed-desktop',
  'archive-mobile',
  'service-media-mobile',
  'compute-garden-mobile',
  'play-transit-mobile',
] as const

export type FloorIntegrationId = (typeof FLOOR_INTEGRATION_IDS)[number]

export type PixelSize = Readonly<{
  width: number
  height: number
}>

/**
 * Scene positions remain numeric and unit-tagged. This prevents undocumented
 * `calc()` strings and transform nudges from accumulating in floor manifests.
 */
export type SceneLength = Readonly<{
  value: number
  unit: 'market' | 'percent' | 'vw' | 'svh' | 'px'
}>

export type RegisteredStagePlacement = Readonly<{
  /**
   * Only the stage height is declared. Width is derived from `sourceCanvas`,
   * preserving the authored aspect ratio at every viewport.
   */
  height: SceneLength
  inline: Readonly<{
    anchor: 'start' | 'center' | 'end'
    offset: SceneLength
  }>
  block: Readonly<{
    anchor: 'start' | 'end'
    offset: SceneLength
  }>
  mirrorX?: boolean
}>

/**
 * Every plate in one floor package occupies this exact registered stage.
 * Individual plates are never independently translated or rescaled.
 */
export type FloorRegisteredStage = Readonly<{
  sourceCanvas: PixelSize
  authoredPixelScale: number
  placement: RegisteredStagePlacement
}>

export type RegisteredIntegrationPlate = Readonly<{
  id: string
  src: string
  phase: IntegrationPhase
  baseOpacity?: number
  activeOpacity?: number
  activeFor?: Bazaar3IntegrationStallId
}>

type LegacyFloorIntegrationSpec = Readonly<{
  id: FloorIntegrationId
  breakpoint: IntegrationBreakpoint
  status: 'legacy'
  stage: null
  plates: readonly []
}>

type AuthoredFloorIntegrationSpec = Readonly<{
  id: FloorIntegrationId
  breakpoint: IntegrationBreakpoint
  status: Exclude<IntegrationStatus, 'legacy'>
  stage: FloorRegisteredStage
  plates: readonly RegisteredIntegrationPlate[]
}>

export type FloorIntegrationSpec =
  | LegacyFloorIntegrationSpec
  | AuthoredFloorIntegrationSpec

export type StallIntegrationVariant =
  | Readonly<{
      status: 'legacy'
      plates: readonly []
    }>
  | Readonly<{
      status: Exclude<IntegrationStatus, 'legacy'>
      plates: readonly RegisteredIntegrationPlate[]
    }>

/**
 * Stall plates use the exact delivered animation-frame canvas for that family.
 * At runtime they fill the existing stall box with the same registration as
 * `FullStallFrames`; the build harness verifies their native dimensions.
 */
export type StallIntegrationSpec = Readonly<{
  stallId: Bazaar3IntegrationStallId
  sourceCanvas: PixelSize
  authoredPixelScale?: number
  variants: Readonly<Record<IntegrationBreakpoint, StallIntegrationVariant>>
}>

const legacyVariant = (): StallIntegrationVariant => ({
  status: 'legacy',
  plates: [],
})

const prototypeVariant = (
  plates: readonly RegisteredIntegrationPlate[] = [],
): StallIntegrationVariant => ({
  status: 'prototype',
  plates,
})

const legacyFloor = (
  id: FloorIntegrationId,
  breakpoint: IntegrationBreakpoint,
): LegacyFloorIntegrationSpec => ({
  id,
  breakpoint,
  status: 'legacy',
  stage: null,
  plates: [],
})

/**
 * The seven current floor compositions are registered here before any visual
 * migration. All remain intentionally empty/legacy until their authored assets
 * pass review.
 */
export const FLOOR_INTEGRATIONS: Readonly<
  Record<FloorIntegrationId, FloorIntegrationSpec>
> = {
  'archive-desktop': legacyFloor('archive-desktop', 'desktop'),
  'workshop-desktop': {
    id: 'workshop-desktop',
    breakpoint: 'desktop',
    status: 'prototype',
    stage: {
      sourceCanvas: { width: 1248, height: 597 },
      authoredPixelScale: 3,
      placement: {
        height: { value: 100, unit: 'percent' },
        inline: {
          anchor: 'center',
          offset: { value: 0, unit: 'px' },
        },
        block: {
          anchor: 'start',
          offset: { value: 0, unit: 'px' },
        },
      },
    },
    plates: [
      {
        id: 'workshop-environment-base',
        src: `${INTEGRATION_ASSET_ROOT}/floors/workshop-desktop/environment-base.png`,
        phase: 'rear',
      },
    ],
  },
  'reclaimed-desktop': legacyFloor('reclaimed-desktop', 'desktop'),
  'archive-mobile': legacyFloor('archive-mobile', 'mobile'),
  'service-media-mobile': legacyFloor('service-media-mobile', 'mobile'),
  'compute-garden-mobile': legacyFloor('compute-garden-mobile', 'mobile'),
  'play-transit-mobile': legacyFloor('play-transit-mobile', 'mobile'),
}

/**
 * Source canvases are measured from each currently approved idle-1 frame.
 * They are instrumentation data, not a request to normalize every stall to one
 * canvas. Distinct approved family dimensions remain distinct.
 */
export const STALL_INTEGRATIONS: Readonly<
  Record<Bazaar3IntegrationStallId, StallIntegrationSpec>
> = {
  uses: {
    stallId: 'uses',
    sourceCanvas: { width: 1147, height: 904 },
    variants: { desktop: legacyVariant(), mobile: legacyVariant() },
  },
  papers: {
    stallId: 'papers',
    sourceCanvas: { width: 1056, height: 1309 },
    variants: { desktop: legacyVariant(), mobile: legacyVariant() },
  },
  manual: {
    stallId: 'manual',
    sourceCanvas: { width: 960, height: 1264 },
    authoredPixelScale: 3,
    variants: {
      desktop: prototypeVariant([
        {
          id: 'manual-local-rear',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/manual/desktop/rear.png`,
          phase: 'rear',
        },
        {
          id: 'manual-local-light',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/manual/desktop/light.png`,
          phase: 'light',
          baseOpacity: 0.14,
          activeOpacity: 0.22,
        },
        {
          id: 'manual-local-caster',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/manual/desktop/caster.png`,
          phase: 'caster',
          baseOpacity: 0.52,
        },
        {
          id: 'manual-local-contact',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/manual/desktop/contact.png`,
          phase: 'contact',
          baseOpacity: 0.84,
        },
        {
          id: 'manual-local-front',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/manual/desktop/front.png`,
          phase: 'front',
        },
      ]),
      mobile: legacyVariant(),
    },
  },
  console: {
    stallId: 'console',
    sourceCanvas: { width: 960, height: 1264 },
    authoredPixelScale: 3,
    variants: {
      desktop: prototypeVariant([
        {
          id: 'console-local-rear',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/console/desktop/rear.png`,
          phase: 'rear',
        },
        {
          id: 'console-local-light',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/console/desktop/light.png`,
          phase: 'light',
          baseOpacity: 0.16,
          activeOpacity: 0.28,
        },
        {
          id: 'console-local-caster',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/console/desktop/caster.png`,
          phase: 'caster',
          baseOpacity: 0.58,
        },
        {
          id: 'console-local-contact',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/console/desktop/contact.png`,
          phase: 'contact',
          baseOpacity: 0.86,
        },
        {
          id: 'console-local-front',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/console/desktop/front.png`,
          phase: 'front',
        },
      ]),
      mobile: legacyVariant(),
    },
  },
  talks: {
    stallId: 'talks',
    sourceCanvas: { width: 941, height: 1006 },
    variants: {
      desktop: prototypeVariant([
        {
          id: 'talks-local-rear',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/talks/desktop/rear.png`,
          phase: 'rear',
        },
        {
          id: 'talks-local-light',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/talks/desktop/light.png`,
          phase: 'light',
          baseOpacity: 0.14,
          activeOpacity: 0.24,
        },
        {
          id: 'talks-local-caster',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/talks/desktop/caster.png`,
          phase: 'caster',
          baseOpacity: 0.56,
        },
        {
          id: 'talks-local-contact',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/talks/desktop/contact.png`,
          phase: 'contact',
          baseOpacity: 0.86,
        },
        {
          id: 'talks-local-front',
          src: `${INTEGRATION_ASSET_ROOT}/stalls/talks/desktop/front.png`,
          phase: 'front',
        },
      ]),
      mobile: legacyVariant(),
    },
  },
  projects: {
    stallId: 'projects',
    sourceCanvas: { width: 960, height: 1264 },
    authoredPixelScale: 3,
    variants: { desktop: legacyVariant(), mobile: legacyVariant() },
  },
  games: {
    stallId: 'games',
    sourceCanvas: { width: 1131, height: 1325 },
    variants: { desktop: legacyVariant(), mobile: legacyVariant() },
  },
  travel: {
    stallId: 'travel',
    sourceCanvas: { width: 960, height: 1264 },
    authoredPixelScale: 3,
    variants: { desktop: legacyVariant(), mobile: legacyVariant() },
  },
}

export function getFloorIntegration(
  id: FloorIntegrationId,
): FloorIntegrationSpec {
  return FLOOR_INTEGRATIONS[id]
}

export function getStallIntegration(
  id: Bazaar3IntegrationStallId,
): StallIntegrationSpec {
  return STALL_INTEGRATIONS[id]
}

export function getIntegrationAssetUrls(): string[] {
  const floorAssets = Object.values(FLOOR_INTEGRATIONS).flatMap((spec) =>
    spec.status === 'legacy' ? [] : spec.plates.map((plate) => plate.src),
  )
  const stallAssets = Object.values(STALL_INTEGRATIONS).flatMap((spec) =>
    Object.values(spec.variants).flatMap((variant) =>
      variant.status === 'legacy'
        ? []
        : variant.plates.map((plate) => plate.src),
    ),
  )

  return [...new Set([...floorAssets, ...stallAssets])]
}
