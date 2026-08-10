'use client'

import { useState } from 'react'
import { tapHaptic } from 'services/haptics'
import { setLetterKeysEnabled, useLetterKeysEnabled } from 'services/hotkeys'
import Modal from 'services/modal'
import { useTheme } from 'services/theme'
import css from './system-settings.module.css'

const LABEL_ID = 'system-settings-title'

// WCAG 2.1.4 and 2.2.2 need a user-reachable off switch for letter
// shortcuts and ambient motion; the trigger reveals on keyboard focus
// like the skip link, so pointer users keep an unbroken scene
const SystemSettings = () => {
  const [open, setOpen] = useState(false)
  const { fxMode, osReducedMotion, setFxMode } = useTheme()
  const letterKeysEnabled = useLetterKeysEnabled()

  return (
    <>
      <button
        type='button'
        className={css.reveal}
        onClick={() => setOpen(true)}
      >
        System preferences ▼
      </button>
      <Modal
        className={css.panel}
        close={() => setOpen(false)}
        labelId={LABEL_ID}
        open={open}
      >
        <h2 id={LABEL_ID} className={css.title}>
          System preferences
        </h2>
        <label className={css.field}>
          <input
            data-initial-focus
            type='checkbox'
            checked={fxMode === 'quiet'}
            disabled={osReducedMotion}
            onChange={(event) => {
              tapHaptic()
              setFxMode(event.target.checked ? 'quiet' : 'full')
            }}
          />
          <span>
            Quiet effects
            <small className={css.hint}>
              {osReducedMotion
                ? 'Locked on: the OS asks for reduced motion.'
                : 'Stops ambient motion and looping scenes.'}
            </small>
          </span>
        </label>
        <label className={css.field}>
          <input
            type='checkbox'
            checked={!letterKeysEnabled}
            onChange={(event) => {
              tapHaptic()
              setLetterKeysEnabled(!event.target.checked)
            }}
          />
          <span>
            Disable single-key shortcuts
            <small className={css.hint}>
              Releases bare letter keys such as j, k, g, and b.
            </small>
          </span>
        </label>
        <button
          type='button'
          className={css.close}
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </Modal>
    </>
  )
}

export default SystemSettings
