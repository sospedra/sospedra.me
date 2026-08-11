'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

// Activity hides routes instead of unmounting them, so gameplay state
// survives back-navigation; the layout cleanup runs at hide and resets
// the session before the page can revive stale
export const useResetOnHide = (reset: () => void) => {
  const resetRef = useRef(reset)
  useEffect(() => {
    resetRef.current = reset
  })
  useLayoutEffect(() => () => resetRef.current(), [])
}
