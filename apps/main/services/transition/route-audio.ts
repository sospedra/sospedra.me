import type { Route } from 'next'
import { useEffect } from 'react'
import { deckSampleUrl } from 'services/audio/deck-samples'
import { canPrefetch } from './use-prefetch'

const ROUTE_AUDIO: Partial<Record<string, () => string[]>> = {
  '/videoclub': () => [deckSampleUrl('insert'), deckSampleUrl('button')],
}

const warmed = new Set<string>()

/** fire-and-forget cache fill; low priority so the current page wins */
export const warmRouteAudio = (url: Route) => {
  const assets = ROUTE_AUDIO[url]?.()
  if (!assets || !canPrefetch()) return
  for (const asset of assets) {
    if (warmed.has(asset)) continue
    warmed.add(asset)
    fetch(asset, { priority: 'low' }).catch(() => warmed.delete(asset))
  }
}

/** mobile has no hover: the first touch anywhere signals intent */
export const useWarmRouteAudioOnTouch = (url: Route) => {
  useEffect(() => {
    if (!ROUTE_AUDIO[url]) return
    const warm = () => warmRouteAudio(url)
    window.addEventListener('touchstart', warm, { once: true, passive: true })
    return () => window.removeEventListener('touchstart', warm)
  }, [url])
}
