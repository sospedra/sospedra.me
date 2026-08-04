import type { MutableRefObject } from 'react'
import Modal from 'services/modal'
import css from './game-dialogs.module.css'
import type { GeoGameState } from './game-state'
import geoControls from './geo-controls.module.css'
import type { GeoLocale, GeoMessages } from './geo-messages'
import shell from './geo-shell.module.css'
import type { GeoSettings } from './model'
import type { GeoGameMode } from './run-mode'

export function DialogHeader({
  close,
  copy,
  eyebrow,
  id,
  title,
}: {
  close: () => void
  copy: GeoMessages
  eyebrow: string
  id: string
  title: string
}) {
  return (
    <header className={css.dialogHeader}>
      <div>
        <p>{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
      <button
        type='button'
        className={css.dialogClose}
        aria-label={copy.close}
        onClick={close}
      >
        <span aria-hidden='true'>×</span>
      </button>
    </header>
  )
}

export function GameDialogs({
  copy,
  locale,
  onClose,
  onLocaleChange,
  onModeChange,
  onSettingsChange,
  opener,
  mode,
  settings,
  state,
  timedState,
}: {
  copy: GeoMessages
  locale: GeoLocale
  onClose: () => void
  onLocaleChange: (locale: GeoLocale) => void
  onModeChange: (mode: GeoGameMode) => void
  onSettingsChange: (settings: GeoSettings) => void
  opener: MutableRefObject<HTMLElement | null>
  mode: GeoGameMode
  settings: GeoSettings
  state: GeoGameState
  timedState: boolean
}) {
  const close = () => {
    onClose()
    window.requestAnimationFrame(() => opener.current?.focus())
  }

  const toggle = (key: 'sound' | 'reducedMotion') => {
    onSettingsChange({ ...settings, [key]: !settings[key] })
  }

  return (
    <>
      <Modal
        open={state.overlay === 'settings'}
        labelId='geo-settings-title'
        close={close}
        className={css.dialog}
      >
        <DialogHeader
          close={close}
          copy={copy}
          eyebrow='SYSTEM // CONFIG'
          id='geo-settings-title'
          title={copy.settingsTitle}
        />
        <div className={css.dialogBody}>
          <ul className={geoControls.settingsList}>
            <li className={`${css.settingRow} ${css.mobileSettingRow}`}>
              <span aria-hidden='true'>{copy.edition}</span>
              <fieldset className={css.settingChoices}>
                <legend className={shell.srOnly}>{copy.edition}</legend>
                <button
                  type='button'
                  className={css.settingChoice}
                  data-active={mode === 'daily'}
                  aria-pressed={mode === 'daily'}
                  disabled={timedState}
                  onClick={() => onModeChange('daily')}
                >
                  {copy.daily}
                </button>
                <button
                  type='button'
                  className={css.settingChoice}
                  data-active={mode === 'practice'}
                  aria-pressed={mode === 'practice'}
                  disabled={timedState}
                  onClick={() => onModeChange('practice')}
                >
                  {copy.practice}
                </button>
              </fieldset>
            </li>
            <li className={`${css.settingRow} ${css.mobileSettingRow}`}>
              <span aria-hidden='true'>{copy.language}</span>
              <fieldset className={css.settingChoices}>
                <legend className={shell.srOnly}>{copy.language}</legend>
                <button
                  type='button'
                  className={css.settingChoice}
                  data-active={locale === 'en'}
                  aria-pressed={locale === 'en'}
                  onClick={() => onLocaleChange('en')}
                >
                  EN
                </button>
                <button
                  type='button'
                  className={css.settingChoice}
                  data-active={locale === 'es'}
                  aria-pressed={locale === 'es'}
                  onClick={() => onLocaleChange('es')}
                >
                  ES
                </button>
              </fieldset>
            </li>
            {(
              [
                ['sound', copy.sound],
                ['reducedMotion', copy.reducedMotion],
              ] as const
            ).map(([key, label], index) => (
              <li className={css.settingRow} key={key}>
                <span>{label}</span>
                <button
                  type='button'
                  className={geoControls.toggle}
                  data-active={settings[key]}
                  aria-pressed={settings[key]}
                  aria-label={label}
                  data-initial-focus={index === 0 ? '' : undefined}
                  onClick={() => toggle(key)}
                />
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      <Modal
        open={state.overlay === 'help'}
        labelId='geo-help-title'
        close={close}
        className={css.dialog}
      >
        <DialogHeader
          close={close}
          copy={copy}
          eyebrow='INPUT // KEYBOARD'
          id='geo-help-title'
          title={copy.helpTitle}
        />
        <div className={css.dialogBody}>
          <ul className={css.helpList}>
            {[
              [['A…', 'Enter'], copy.keyAnswer],
              [['P'], copy.keyPass],
              [['←', '↑', '↓', '→'], copy.keyArrows],
              [['Enter'], copy.keyEnter],
              [['+', '−'], copy.keyMapZoom],
              [['Home'], copy.keyHome],
              [['M'], copy.keySound],
              [['?'], copy.keyHelp],
              [['Esc'], copy.keyEscape],
            ].map(([keys, description], index) => (
              <li className={css.helpRow} key={description as string}>
                <span className={css.helpKeys}>
                  {(keys as string[]).map((key) => (
                    <kbd
                      key={key}
                      data-initial-focus={index === 0 ? '' : undefined}
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
                <span>{description as string}</span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  )
}
