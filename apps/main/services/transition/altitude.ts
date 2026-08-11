import { matchRoutePattern } from './route-pattern'

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

// chrome = the sky plane color at the scene's viewport bottom; it paints the
// browser bars and the overscroll canvas outside the 100dvh layers
const SCENES: Record<string, Scene> = {
  '/papers': {
    altitude: 1,
    offset: 'translate3d(0vw, -250vh, 0)',
    starsHidden: false,
    chrome: '#2d0e39',
  },
  '/papers/:slug': {
    altitude: 2,
    offset: 'translate3d(0vw, 0vh, 0)',
    starsHidden: true,
    chrome: '#141925',
  },
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

export type RouteBars = {
  top?: string
  bottom?: string
  canvas: string
}

// iOS 26 samples ~40px fixed strips at each viewport edge for the bar
// tints; `bottom` also feeds theme-color (Android toolbar), `canvas`
// feeds the overscroll via html/body
// document-scrolling routes get NO strips at all: a bottom strip paints
// over the content bleeding through the glass, and the 900ms nudge
// re-sample can flip a bleeding bar back to flat tint
const ROUTE_BARS: Record<string, RouteBars> = {
  '/': { top: '#300f3b', bottom: '#101324', canvas: '#101324' },
  // owner canon: the bazaar bottom reads black on device
  '/bazaar': { canvas: '#000000' },
  '/boombox': { top: '#0e141b', bottom: '#1a1024', canvas: '#0e141b' },
  '/camera': { top: '#0c141d', bottom: '#0c0711', canvas: '#070b10' },
  '/cims': { top: '#020302', bottom: '#071008', canvas: '#071008' },
  '/console': { top: '#050403', bottom: '#050403', canvas: '#050403' },
  '/crosswords': { top: '#d4d7db', bottom: '#d4d7db', canvas: '#d4d7db' },
  '/game-of-life': { top: '#151610', bottom: '#151610', canvas: '#151610' },
  '/games': { top: '#020307', bottom: '#020307', canvas: '#020307' },
  '/meridian': { top: '#080907', bottom: '#080907', canvas: '#080907' },
  '/recycle-bin': { canvas: '#0e141b' },
  '/rubiks': { top: '#121a23', bottom: '#070c11', canvas: '#070c11' },
  '/scavenger': { top: '#180a38', bottom: '#0e141b', canvas: '#0e141b' },
  '/snake': { top: '#131c24', bottom: '#1c2514', canvas: '#1c2514' },
  '/styles': { canvas: '#0f0e11' },
  '/styles/clay': { canvas: '#eb9d92' },
  '/styles/frasurbane': { canvas: '#e7e0cf' },
  '/styles/mishko': { canvas: '#0a080c' },
  '/styles/neubrutalism': { canvas: '#f2eee3' },
  '/styles/overprint': { canvas: '#f0eadc' },
  '/styles/stickers': { canvas: '#9c7440' },
  '/travel': { canvas: '#080a14' },
  '/uses': { canvas: '#0d0708' },
  '/videoclub': { top: '#050608', bottom: '#050608', canvas: '#050608' },
  '/w98': { top: '#008080', bottom: '#008080', canvas: '#008080' },
}

// load-time html/body tint for strip-less routes where the sky at the
// viewport TOP edge differs from the canvas (chrome colors are bottom-edge)
const ROUTE_TINT: Record<string, string> = {
  '/papers': '#241333',
  '/papers/:slug': '#10161f',
  '/about': '#3e0f47',
  '/bazaar': '#0e141b',
}

export const barsFor = (href: string): RouteBars => {
  const match = Object.entries(ROUTE_BARS).find(([pattern]) =>
    matchRoutePattern(href, pattern),
  )
  return match?.[1] ?? { canvas: sceneFor(href).chrome }
}

// the html/body color iOS samples for the status zone: the sky at the
// viewport top edge, never the bottom-edge canvas
export const tintFor = (href: string): string => {
  const match = Object.entries(ROUTE_TINT).find(([pattern]) =>
    matchRoutePattern(href, pattern),
  )
  return match?.[1] ?? barsFor(href).top ?? barsFor(href).canvas
}

// Safari reads theme-color once at load, so each art-directed page
// server-renders its own; Android tints its toolbar with it
export const routeViewport = (href: string) => ({
  themeColor: barsFor(href).bottom ?? barsFor(href).canvas,
})

// iOS 26 derives the load-time status-bar tint from the html and body
// backgrounds, not from the painted pixels; both must carry the top color
// from the first parsed byte or the bar sticks to the void. The pair's
// second color feeds the bottom overscroll shield.
const loadTintMap = (): Record<string, readonly [string, string]> => {
  const fromScenes = Object.entries(SCENES).map(
    ([pattern, scene]) => [pattern, [scene.chrome, scene.chrome]] as const,
  )
  const fromBars = Object.entries(ROUTE_BARS).map(
    ([pattern, bars]) =>
      [pattern, [bars.top ?? bars.canvas, bars.canvas]] as const,
  )
  const fromTint = Object.entries(ROUTE_TINT).map(
    ([pattern, tint]) => [pattern, [tint, barsFor(pattern).canvas]] as const,
  )
  return Object.fromEntries([...fromScenes, ...fromBars, ...fromTint])
}

export const loadTintScript = () =>
  `(function(){var m=${JSON.stringify(loadTintMap())};` +
  `var p=location.pathname.replace(/\\/+$/,"")||"/";var c=m[p];` +
  `if(!c){var s=p.split("/");for(var k in m){var t=k.split("/");` +
  `if(t.length!==s.length)continue;var ok=1;` +
  `for(var i=0;i<t.length;i++){if(t[i].charAt(0)!==":"&&t[i]!==s[i]){ok=0;break}}` +
  `if(ok){c=m[k];break}}}` +
  `c=c||["${DEFAULT_SCENE.chrome}","${DEFAULT_SCENE.chrome}"];` +
  `document.documentElement.style.backgroundColor=c[0];` +
  `document.body.style.backgroundColor=c[0];` +
  `document.documentElement.style.setProperty("--route-bottom",c[1]);})()`

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
