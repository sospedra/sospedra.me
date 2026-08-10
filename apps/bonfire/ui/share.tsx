'use client'

import { useState } from 'react'
import { pulseHaptic } from 'services/haptics'
import { sessionHash } from 'services/session'
import type { Session } from 'services/use-session'

const NICK_KEY = 'bonfire-nick'

export const storedNick = (fallback: string): string =>
  window.localStorage.getItem(NICK_KEY) ?? fallback

export const storeNick = (nick: string): void =>
  window.localStorage.setItem(NICK_KEY, nick)

export function Share(props: { session: Session }) {
  const { runtime, shareSession, rename } = props.session
  const [copied, setCopied] = useState(false)

  if (runtime.phase === 'gate' || runtime.phase === 'seated') return null

  if (runtime.phase === 'solo') {
    return (
      <button
        className='mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-xs text-ash transition duration-150 ease-out-strong hover:border-ember hover:text-ember active:scale-[0.98]'
        onClick={() => shareSession(storedNick('keeper'))}
        type='button'
      >
        share the fire
      </button>
    )
  }

  const link =
    runtime.link === null
      ? ''
      : `${window.location.origin}${window.location.pathname}${sessionHash(runtime.link)}`

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    pulseHaptic()
    setCopied(true)
  }

  return (
    <div className='mt-3 flex flex-row items-center gap-2'>
      <input
        aria-label='your nick'
        className='min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-firelight transition-colors duration-150 focus:border-ember/60'
        maxLength={24}
        onChange={(event) => {
          rename(event.target.value)
          storeNick(event.target.value)
        }}
        value={runtime.nick}
      />
      <button
        className='rounded-lg border border-ember/50 px-3 py-2 text-xs text-ember transition duration-150 ease-out-strong hover:bg-ember/10 active:scale-[0.98]'
        onClick={copy}
        type='button'
      >
        {copied ? 'copied' : 'copy link'}
      </button>
    </div>
  )
}
