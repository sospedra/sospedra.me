'use client'

import { debounce } from 'es-toolkit'
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

const writeClipboardLegacy = (text: string) => {
  const scratch = document.createElement('textarea')
  scratch.value = text
  scratch.readOnly = true
  scratch.style.position = 'fixed'
  scratch.style.left = '-9999px'
  document.body.append(scratch)
  scratch.select()
  scratch.setSelectionRange(0, scratch.value.length)
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    scratch.remove()
  }
}

// navigator.clipboard needs a secure context; LAN device testing runs http
const writeClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return writeClipboardLegacy(text)
  }
}

const CopyButton = ({ source }: { source: string }) => {
  const [phase, setPhase] = useState<CopyPhase>('idle')
  const resetRef = useRef(debounce(() => setPhase('idle'), resetDelay))

  useEffect(() => () => resetRef.current.cancel(), [])

  const copy = async () => {
    const written = await writeClipboard(source)
    setPhase(written ? 'copied' : 'failed')
    resetRef.current()
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
