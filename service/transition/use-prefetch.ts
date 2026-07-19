import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const usePrefetch = (url: string) => {
  const router = useRouter()

  useEffect(() => {
    router.prefetch(url)
  }, [router, url])
}
