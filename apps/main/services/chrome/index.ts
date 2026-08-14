import {
  defaultSkyChrome,
  sceneFor,
  scenePatterns,
} from 'services/transition/altitude'
import { matchRoutePattern } from 'services/transition/route-pattern.ts'

// one color, one job:
// statusTint  = BOTH iOS bars by default. iOS reads the body background for
//               the status bar and the toolbar alike, never the painted
//               pixels and never the html background.
// toolbarTint = the iOS bottom toolbar when it must differ from statusTint.
//               The strip needs in-viewport pixels to get sampled, so its
//               4px sliver shows: the value must equal the page's own
//               bottom edge, never a bar-only color. Omit it when it would
//               equal statusTint and on document-scrolling routes.
// overscroll  = the rubber-band reveal and the bottom shield band.
//               Defaults to the scene chrome (the sky at the bottom edge).
export type RouteChrome = {
  statusTint: string
  toolbarTint?: string
  overscroll?: string
}

const PAPER_CHROME: RouteChrome = { statusTint: '#10161f' }

const ROUTE_CHROME: Record<string, RouteChrome> = {
  // transparent shield: home is the one route drawn on the sky plane itself,
  // and the bridge ride shows the sky through the world's transparent band
  '/': {
    statusTint: '#300f3b',
    toolbarTint: '#101324',
    overscroll: 'transparent',
  },
  '/about': { statusTint: '#3e0f47' },
  // owner canon: the bazaar bottom reads black on device
  '/bazaar': { statusTint: '#0e141b', overscroll: '#000000' },
  '/boombox': { statusTint: '#1a1024', overscroll: '#1a1024' },
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
  '/console': { statusTint: '#050403', overscroll: '#050403' },
  '/crosswords': { statusTint: '#ccd0d4', overscroll: '#ccd0d4' },
  '/game-of-life': { statusTint: '#151610', overscroll: '#151610' },
  '/games': { statusTint: '#000000', overscroll: '#000000' },
  '/meridian': { statusTint: '#080907', overscroll: '#080907' },
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
  '/videoclub': { statusTint: '#050608', overscroll: '#050608' },
  '/w98': {
    statusTint: '#008080',
    toolbarTint: '#c0c0c0',
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
  const patterns = new Set([...scenePatterns, ...Object.keys(ROUTE_CHROME)])
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
  `c=c||["${defaultSkyChrome}","${defaultSkyChrome}"];` +
  `document.documentElement.style.backgroundColor=c[0];` +
  `document.body.style.backgroundColor=c[0];` +
  `document.documentElement.style.setProperty("--route-overscroll",c[1]);})()`
