import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'

type NetworkInformation = {
  effectiveType?: string
  saveData?: boolean
}

const canPrefetch = () => {
  const connection = (
    navigator as Navigator & { connection?: NetworkInformation }
  ).connection

  if (connection?.saveData) return false
  return (
    connection?.effectiveType !== 'slow-2g' &&
    connection?.effectiveType !== '2g'
  )
}

export const usePrefetch = (url: Route) => {
  const router = useRouter()
  const prefetchedUrl = useRef<Route | null>(null)

  return useCallback(() => {
    if (prefetchedUrl.current === url || !canPrefetch()) return
    prefetchedUrl.current = url
    router.prefetch(url)
  }, [router, url])
}
