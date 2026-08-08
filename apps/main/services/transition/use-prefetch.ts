import type { Route } from 'next'
import { useRouter } from 'next/navigation'

type NetworkInformation = {
  effectiveType?: string
  saveData?: boolean
}

const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g'])

export const canPrefetch = () => {
  const connection = (
    navigator as Navigator & { connection?: NetworkInformation }
  ).connection

  if (connection?.saveData) return false
  return !SLOW_EFFECTIVE_TYPES.has(connection?.effectiveType ?? '')
}

export const usePrefetch = (url: Route) => {
  const router = useRouter()

  return () => {
    if (!canPrefetch()) return
    router.prefetch(url)
  }
}
