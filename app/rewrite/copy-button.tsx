'use client'

import { useEffect, useRef, useState } from 'react'
import css from './rewrites.module.css'

export default function CopyButton(props: { source: string }) {
  const [status, setStatus] = useState('')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const url = `https://sospedra.me${props.source}`

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('TRANSMISSION COPIED ▼')
    } catch {
      setStatus('COPY FAILED / SELECT URL')
    }

    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setStatus(''), 2400)
  }

  return (
    <div className={css.copyControl}>
      <button
        aria-label={`Copy ${url}`}
        className={css.copy}
        onClick={() => void copy()}
        type='button'
      >
        <span>{props.source}</span>
        <span aria-hidden='true' className={css.copyMark}>
          COPY
        </span>
      </button>
      <span aria-live='polite' className={css.copyStatus} role='status'>
        {status}
      </span>
    </div>
  )
}
