import { type FC, useEffect } from 'react'
import { createLogger } from 'services/logger'
import { prefersQuietFx } from 'services/theme'
import css from './easteregg.module.css'

const fullDuration = 3200
const quietDuration = 1200
const log = createLogger('easteregg')

const Egg: FC<{
  exitFullscreenOnComplete: boolean
  onComplete: () => void
}> = ({ exitFullscreenOnComplete, onComplete }) => {
  useEffect(() => {
    const root = document.documentElement
    const isQuiet = prefersQuietFx()
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
        document.exitFullscreen().catch((error) => {
          log.warn('fullscreen exit denied', { error })
        })
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
        <strong data-text='ATTACK DETECTED'>ATTACK DETECTED</strong>
        <span className={css.confirm}>INTRUSION TRACED · ANOMALY LOGGED</span>
        <span className={css.progress}>
          <i />
        </span>
        <small>REALITY BUFFER WILL SELF-RESTORE</small>
      </div>
      <span className='sr-only'>
        Konami code accepted. Attack detected and anomaly logged.
      </span>
    </div>
  )
}

export default Egg
