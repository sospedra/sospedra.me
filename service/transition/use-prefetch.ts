import { useEffect } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'

export const usePrefetch = (url: Route) => {
  const router = useRouter()

  useEffect(() => {
    router.prefetch(url)
  }, [router, url])
}
