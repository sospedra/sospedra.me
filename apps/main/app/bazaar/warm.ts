import { canPrefetch, usePrefetch } from 'services/transition/use-prefetch'
import { SKYLINE_WARM } from './warm-list'

const warmed = new Set<string>()

/** fire-and-forget cache fill; low priority so home's own assets win */
export const warmBazaarArt = (urls: string[]) => {
  if (!canPrefetch()) return
  for (const url of urls) {
    if (warmed.has(url)) continue
    warmed.add(url)
    const image = new Image()
    image.fetchPriority = 'low'
    image.decoding = 'async'
    image.src = url
  }
}

/** intent tier for the home entry: route payload + the six skyline files */
export const useWarmBazaarEntry = () => {
  const prefetch = usePrefetch('/bazaar')
  return () => {
    prefetch()
    warmBazaarArt(SKYLINE_WARM)
  }
}
