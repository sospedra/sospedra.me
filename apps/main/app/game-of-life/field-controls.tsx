import { ActionKey, RepeatActionKey } from './action-key'
import controlDeck from './control-deck.module.css'
import css from './field-controls.module.css'
import keyBank from './key-bank.module.css'
import type { LifeMechanicalSound } from './life-audio'
import type { LifeCanvasUi } from './life-canvas'
import modeButton from './mode-button.module.css'

export const FieldControls = ({
  canvas,
  playMechanicalSound,
  resetUniverse,
}: {
  canvas: LifeCanvasUi
  playMechanicalSound: (kind: LifeMechanicalSound) => void
  resetUniverse: () => void
}) => (
  <section className={`${controlDeck.controlModule} ${css.fieldControls}`}>
    <header>
      <span>Field input</span>
      <output>Seed memory</output>
    </header>

    <div className={css.fieldModeSwitch}>
      <button
        type='button'
        className={modeButton.modeButton}
        data-control='reset'
        aria-label='Restore the loaded seed at generation zero'
        data-life-sfx='key'
        data-no-press-pulse
        onClick={resetUniverse}
      >
        <span className={modeButton.modeOutline} aria-hidden='true' />
        <span className={modeButton.modeButtonTop}>
          <i className={modeButton.modeLed} aria-hidden='true' />
          <span className={modeButton.modeIcon} aria-hidden='true' />
          <span className={modeButton.modeLabel}>
            <small>Restore seed</small>
            <strong>Reset</strong>
          </span>
        </span>
        <span className={modeButton.modeButtonBottom} aria-hidden='true' />
        <span className={modeButton.modeButtonBase} aria-hidden='true' />
      </button>
    </div>

    <fieldset className={css.opticsKeys}>
      <legend className='sr-only'>Canvas magnification</legend>
      <div className={`${keyBank['radio-input']} ${keyBank.labKeyBank}`}>
        <RepeatActionKey
          aria-label='Zoom out. Press and hold for continuous zoom.'
          action={() => canvas.zoomBy(1 / 1.12)}
          repeatCue={() => playMechanicalSound('key')}
        >
          −
        </RepeatActionKey>
        <ActionKey aria-label='Fit live cells in view' onClick={canvas.fit}>
          Fit
        </ActionKey>
        <RepeatActionKey
          aria-label='Zoom in. Press and hold for continuous zoom.'
          action={() => canvas.zoomBy(1.12)}
          repeatCue={() => playMechanicalSound('key')}
        >
          +
        </RepeatActionKey>
      </div>
    </fieldset>
  </section>
)
