import { matchRoutePattern } from './route-pattern.ts'

export type Scene = {
  altitude: number
  offset: string
  starsHidden: boolean
  chrome: string
}

const DEFAULT_SCENE: Scene = {
  altitude: 0,
  offset: 'translate3d(0vw, -400vh, 0)',
  starsHidden: false,
  chrome: '#37113f',
}

// a pattern only matches an href of the same segment count, so every
// translated paper needs its own key or it falls back to the default sky
const PAPER_SCENE: Scene = {
  altitude: 2,
  offset: 'translate3d(0vw, 0vh, 0)',
  starsHidden: true,
  chrome: '#141925',
}

// chrome = the sky plane color at the scene's viewport bottom; it paints the
// browser bars and the overscroll canvas outside the 100dvh layers
const SCENES: Record<string, Scene> = {
  '/papers': {
    altitude: 1,
    offset: 'translate3d(0vw, -250vh, 0)',
    starsHidden: false,
    chrome: '#2d0e39',
  },
  '/papers/:slug': PAPER_SCENE,
  '/papers/:slug/:lang': PAPER_SCENE,
  '/about': {
    altitude: 0,
    offset: 'translate3d(-100vw, -400vh, 0)',
    starsHidden: true,
    chrome: '#441049',
  },
  '/bazaar': {
    altitude: 1,
    offset: 'translate3d(-300vw, -250vh, 0)',
    starsHidden: false,
    chrome: '#192e4b',
  },
}

export const sceneFor = (href: string): Scene => {
  const match = Object.entries(SCENES).find(([pattern]) =>
    matchRoutePattern(href, pattern),
  )
  return match?.[1] ?? DEFAULT_SCENE
}

// services/chrome derives the bar tints from the scene skies
export const scenePatterns = Object.keys(SCENES)
export const defaultSkyChrome = DEFAULT_SCENE.chrome

export const getAltitude = (href: string): number => sceneFor(href).altitude

let current: string | null = null
let previous: string | null = null

export const recordPathname = (pathname: string) => {
  if (pathname === current) return
  previous = current
  current = pathname
}

// The route the visitor arrived from, null on a fresh load. The provider
// may record the destination before or after the entering stage reads it
// (page content can commit later than the router state), so pick the slot
// that is not the stage's own pathname.
export const getOriginPathname = (pathname: string) =>
  current === pathname ? previous : current
