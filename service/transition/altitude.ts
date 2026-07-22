import { createPtr } from './create-ptr'

// Camera altitude per route: each level looks further up the sky.
// Matches the vertical bands of the Background pan.
export const getAltitude = (href: string): number => {
  const ptr = createPtr(href)
  switch (true) {
    case ptr('/papers'):
    case ptr('/bazaar'):
      return 1
    case ptr('/papers/:slug'):
      return 2
    default:
      return 0
  }
}

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
