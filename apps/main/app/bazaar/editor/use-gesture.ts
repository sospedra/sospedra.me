'use client'

import { useRef } from 'react'

/** one history command per scrub gesture: live writes stream, commit records */
export const useGesture = <Patch>(
  write: (patch: Patch) => void,
  edit: (patch: Patch) => void,
  begin: () => unknown,
  end: (token: never) => void,
) => {
  const token = useRef<unknown>(null)
  return {
    begin: () => {
      token.current = begin()
    },
    live: write,
    commit: (patch: Patch) => {
      if (token.current === null) {
        edit(patch)
        return
      }
      write(patch)
      end(token.current as never)
      token.current = null
    },
  }
}
