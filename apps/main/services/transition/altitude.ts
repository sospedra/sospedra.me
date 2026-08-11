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

// one color, one job:
// statusTint  = the sky at the viewport TOP edge. iOS reads it off the
//               html and body backgrounds, so nothing paints on the page.
// toolbarTint = the iOS bottom toolbar. A fixed strip hangs fully below
//               the viewport and feeds the sample. Omit it on
//               document-scrolling routes: the strip flat-paints over the
//               content bleeding through the glass.
// overscroll  = the rubber-band reveal and the bottom shield band.
//               Defaults to the scene chrome (the sky at the bottom edge).
export type RouteChrome = {
  statusTint: string
  toolbarTint?: string
  overscroll?: string
}

const PAPER_CHROME: RouteChrome = { statusTint: '#10161f' }

const ROUTE_CHROME: Record<string, RouteChrome> = {
  '/': { statusTint: '#300f3b', toolbarTint: '#101324', overscroll: '#101324' },
  '/about': { statusTint: '#3e0f47' },
  // owner canon: the bazaar bottom reads black on device
  '/bazaar': { statusTint: '#0e141b', overscroll: '#000000' },
  '/boombox': {
    statusTint: '#0e141b',
    toolbarTint: '#1a1024',
    overscroll: '#0e141b',
  },
  '/camera': {
    statusTint: '#0c141d',
    toolbarTint: '#0c0711',
    overscroll: '#070b10',
  },
  '/cims': {
    statusTint: '#020302',
    toolbarTint: '#071008',
    overscroll: '#071008',
  },
  '/console': {
    statusTint: '#050403',
    toolbarTint: '#050403',
    overscroll: '#050403',
  },
  '/crosswords': {
    statusTint: '#d4d7db',
    toolbarTint: '#d4d7db',
    overscroll: '#d4d7db',
  },
  '/game-of-life': {
    statusTint: '#151610',
    toolbarTint: '#151610',
    overscroll: '#151610',
  },
  '/games': {
    statusTint: '#020307',
    toolbarTint: '#020307',
    overscroll: '#020307',
  },
  '/meridian': {
    statusTint: '#080907',
    toolbarTint: '#080907',
    overscroll: '#080907',
  },
  '/papers': { statusTint: '#241333' },
  '/papers/:slug': PAPER_CHROME,
  '/papers/:slug/:lang': PAPER_CHROME,
  '/recycle-bin': { statusTint: '#0e141b', overscroll: '#0e141b' },
  '/rubiks': {
    statusTint: '#121a23',
    toolbarTint: '#070c11',
    overscroll: '#070c11',
  },
  '/scavenger': {
    statusTint: '#180a38',
    toolbarTint: '#0e141b',
    overscroll: '#0e141b',
  },
  '/snake': {
    statusTint: '#131c24',
    toolbarTint: '#1c2514',
    overscroll: '#1c2514',
  },
  '/styles': { statusTint: '#0f0e11', overscroll: '#0f0e11' },
  '/styles/clay': { statusTint: '#eb9d92', overscroll: '#eb9d92' },
  '/styles/frasurbane': { statusTint: '#e7e0cf', overscroll: '#e7e0cf' },
  '/styles/mishko': { statusTint: '#0a080c', overscroll: '#0a080c' },
  '/styles/neubrutalism': { statusTint: '#f2eee3', overscroll: '#f2eee3' },
  '/styles/overprint': { statusTint: '#f0eadc', overscroll: '#f0eadc' },
  '/styles/stickers': { statusTint: '#9c7440', overscroll: '#9c7440' },
  '/travel': { statusTint: '#080a14', overscroll: '#080a14' },
  '/uses': { statusTint: '#0d0708', overscroll: '#0d0708' },
  '/videoclub': {
    statusTint: '#050608',
    toolbarTint: '#050608',
    overscroll: '#050608',
  },
  '/w98': {
    statusTint: '#008080',
    toolbarTint: '#008080',
    overscroll: '#008080',
  },
}

export type ResolvedChrome = {
  statusTint: string
  toolbarTint: string | null
  overscroll: string
}

export const chromeFor = (href: string): ResolvedChrome => {
  const entry = Object.entries(ROUTE_CHROME).find(([pattern]) =>
    matchRoutePattern(href, pattern),
  )?.[1]
  const chrome = sceneFor(href).chrome
  return {
    statusTint: entry?.statusTint ?? chrome,
    toolbarTint: entry?.toolbarTint ?? null,
    overscroll: entry?.overscroll ?? chrome,
  }
}

// Safari reads theme-color once at load, so each art-directed page
// server-renders its own; Android tints its toolbar with it
export const routeViewport = (href: string) => {
  const { toolbarTint, overscroll } = chromeFor(href)
  return { themeColor: toolbarTint ?? overscroll }
}

// iOS 26 derives the load-time status-bar tint from the html and body
// backgrounds, not from the painted pixels; both must carry the top color
// from the first parsed byte or the bar sticks to the void. The pair's
// second color feeds the bottom overscroll shield.
const loadTintMap = (): Record<string, readonly [string, string]> => {
  const patterns = new Set([
    ...Object.keys(SCENES),
    ...Object.keys(ROUTE_CHROME),
  ])
  return Object.fromEntries(
    [...patterns].map((pattern) => {
      const { statusTint, overscroll } = chromeFor(pattern)
      return [pattern, [statusTint, overscroll] as const]
    }),
  )
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
  `document.documentElement.style.setProperty("--route-overscroll",c[1]);})()`

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
