'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useHotkeys } from 'service/hotkeys'

// `[` / `]` walk the archive in board order: `[` is the newer paper
// (one row up on /papers), `]` the older one
export default function PaperKeys(props: { newer?: string; older?: string }) {
  const router = useRouter()

  const warpTo = (slug?: string) => (event: KeyboardEvent) => {
    if (!slug) return
    event.preventDefault()
    router.push(`/papers/${slug}` as Route)
  }

  useHotkeys([
    ['[', warpTo(props.newer)],
    [']', warpTo(props.older)],
  ])

  return null
}
