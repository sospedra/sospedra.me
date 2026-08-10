import type { Route } from 'next'
import { useRouter } from 'next/navigation'

type NetworkInformation = {
  effectiveType?: string
  saveData?: boolean
}

const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g'])

const ROUTE_ASSETS: Partial<Record<Route, string>> = {
  '/games': '/sounds/startup.webm',
}

const warmedAssets = new Set<string>()

const prefetchRouteAssets = (url: Route) => {
  const asset = ROUTE_ASSETS[url]
  if (!asset || warmedAssets.has(asset)) return
  warmedAssets.add(asset)
  void fetch(asset).catch(() => warmedAssets.delete(asset))
}

export const canPrefetch = () => {
  const connection = (
    navigator as Navigator & { connection?: NetworkInformation }
  ).connection

  if (connection?.saveData) return false
  return !SLOW_EFFECTIVE_TYPES.has(connection?.effectiveType ?? '')
}

// touch has no hover to anticipate a route: the first tap anywhere
// warms every mapped route asset instead
export const installFirstTouchPrefetch = () => {
  const warm = () => {
    if (!canPrefetch()) return
    for (const url of Object.keys(ROUTE_ASSETS) as Route[]) {
      prefetchRouteAssets(url)
    }
  }
  window.addEventListener('touchstart', warm, { once: true, passive: true })
  return () => window.removeEventListener('touchstart', warm)
}

export const usePrefetch = (url: Route) => {
  const router = useRouter()

  return () => {
    if (!canPrefetch()) return
    router.prefetch(url)
    prefetchRouteAssets(url)
  }
}
