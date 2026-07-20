'use client'

import { useEffect, useRef, useState } from 'react'
import css from './code.module.css'

const resetDelay = 1800

const CopyButton = () => {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  const copy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const code = event.currentTarget
      .closest('[data-code-frame]')
      ?.querySelector('code')?.textContent

    if (!code) return

    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)

      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setCopied(false), resetDelay)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <button
        aria-label={copied ? 'Code copied' : 'Copy code'}
        className={css.copy}
        data-copied={copied}
        onClick={copy}
        type='button'
      >
        <span aria-hidden='true'>{copied ? 'COPIED' : 'COPY'}</span>
      </button>
      <span aria-live='polite' className='sr-only' role='status'>
        {copied ? 'Code copied to clipboard' : ''}
      </span>
    </>
  )
}

export default CopyButton
