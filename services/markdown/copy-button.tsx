'use client'

import { useEffect, useRef, useState } from 'react'
import css from './code.module.css'

const resetDelay = 1800

type CopyPhase = 'idle' | 'copied' | 'failed'

const BUTTON_LABELS: Record<CopyPhase, string> = {
  idle: 'Copy code',
  copied: 'Code copied',
  failed: 'Copy failed',
}

const BUTTON_TEXT: Record<CopyPhase, string> = {
  idle: 'COPY',
  copied: 'COPIED',
  failed: 'FAILED',
}

const STATUS_TEXT: Record<CopyPhase, string> = {
  idle: '',
  copied: 'Code copied to clipboard',
  failed: 'Copy to clipboard failed',
}

const writeClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const CopyButton = ({ source }: { source: string }) => {
  const [phase, setPhase] = useState<CopyPhase>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  const copy = async () => {
    const written = await writeClipboard(source)
    setPhase(written ? 'copied' : 'failed')
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setPhase('idle'), resetDelay)
  }

  return (
    <>
      <button
        aria-label={BUTTON_LABELS[phase]}
        className={css.copy}
        data-copied={phase === 'copied'}
        onClick={copy}
        type='button'
      >
        <span aria-hidden='true'>{BUTTON_TEXT[phase]}</span>
      </button>
      <span aria-live='polite' className='sr-only' role='status'>
        {STATUS_TEXT[phase]}
      </span>
    </>
  )
}

export default CopyButton
