import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export const usePrefetch = (url: Route) => {
  const router = useRouter()

  useEffect(() => {
    router.prefetch(url)
  }, [router, url])
}
