import { type FC, useEffect } from 'react'
import css from './easteregg.module.css'

const fullDuration = 3200
const quietDuration = 1200

const Egg: FC<{
  exitFullscreenOnComplete: boolean
  onComplete: () => void
}> = ({ exitFullscreenOnComplete, onComplete }) => {
  useEffect(() => {
    const root = document.documentElement
    const isQuiet =
      root.classList.contains('fx-quiet') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    root.dataset.systemOverride = 'konami'

    const timeout = window.setTimeout(
      onComplete,
      isQuiet ? quietDuration : fullDuration,
    )

    return () => {
      window.clearTimeout(timeout)
      if (root.dataset.systemOverride === 'konami') {
        delete root.dataset.systemOverride
      }
      if (exitFullscreenOnComplete && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [exitFullscreenOnComplete, onComplete])

  return (
    <div className={css.override} aria-live='polite' role='status'>
      <div aria-hidden='true' className={css.scan} />
      <div aria-hidden='true' className={css.tears}>
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden='true' className={css.message}>
        <span className={css.eyebrow}>SYS://OVERRIDE · CHANNEL 30</span>
        <strong data-text='KONAMI SIGNAL'>KONAMI SIGNAL</strong>
        <span className={css.confirm}>ACCEPTED · ANOMALY LOGGED</span>
        <span className={css.progress}>
          <i />
        </span>
        <small>REALITY BUFFER WILL SELF-RESTORE</small>
      </div>
      <span className='sr-only'>
        Konami code accepted. System override active and anomaly logged.
      </span>
    </div>
  )
}

export default Egg
