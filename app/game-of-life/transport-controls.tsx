import { ActionKey } from './action-key'
import controlDeck from './control-deck.module.css'
import type { LifeState } from './engine'
import fieldToggle from './field-toggle.module.css'
import keyBank from './key-bank.module.css'
import type { LifeCanvasUi } from './life-canvas'
import runSwitch from './run-switch.module.css'
import switchShell from './switch-shell.module.css'
import css from './transport-controls.module.css'

const fieldToolLabel = (tool: LifeCanvasUi['tool']) =>
  `Field tool: ${tool === 'move' ? 'Slew' : 'Draw'} active`

export const TransportControls = ({
  canvas,
  clearUniverse,
  running,
  soundEnabled,
  state,
  stepOnce,
  toggleSound,
  toggleRunning,
}: {
  canvas: LifeCanvasUi
  clearUniverse: () => void
  running: boolean
  soundEnabled: boolean
  state: LifeState
  stepOnce: () => void
  toggleSound: () => void
  toggleRunning: () => void
}) => (
  <section className={`${controlDeck.controlModule} ${css.transportControls}`}>
    <div className={css.transportHardware}>
      <div
        className={css.runHardware}
        data-running={running ? 'true' : 'false'}
        data-disabled={state.cells.size === 0 ? 'true' : 'false'}
      >
        <span
          className={`${runSwitch.switch} ${runSwitch.runSwitch}`}
          data-disabled={state.cells.size === 0 ? 'true' : 'false'}
        >
          <span className={switchShell['switch-border1']}>
            <span className={switchShell['switch-border2']}>
              <input
                checked={running}
                type='checkbox'
                id='life-run-switch'
                role='switch'
                aria-checked={running}
                aria-label={running ? 'Stop simulation' : 'Start simulation'}
                disabled={state.cells.size === 0}
                onChange={toggleRunning}
              />
              <label
                htmlFor='life-run-switch'
                aria-label={running ? 'Stop simulation' : 'Start simulation'}
              />
              <span className={switchShell['switch-top']} />
              <span className={switchShell['switch-shadow']} />
              <span className={runSwitch['switch-handle']} />
              <span className={runSwitch['switch-handle-left']} />
              <span className={runSwitch['switch-handle-right']} />
              <span className={runSwitch['switch-handle-top']} />
              <span className={runSwitch['switch-handle-bottom']} />
              <span className={runSwitch['switch-handle-base']} />
            </span>
          </span>
        </span>

        <span className={css.runStatusLeds} aria-hidden='true'>
          <span data-lit={running ? 'true' : 'false'}>
            <i />
            On
          </span>
          <span data-lit={running ? 'false' : 'true'}>
            <i />
            Off
          </span>
        </span>
      </div>

      <label
        className={fieldToggle.fieldSwitch}
        data-life-sfx='lever'
        aria-label={fieldToolLabel(canvas.tool)}
      >
        <input
          className={fieldToggle.fieldSwitchInput}
          type='checkbox'
          checked={canvas.tool === 'move'}
          role='switch'
          aria-checked={canvas.tool === 'move'}
          aria-label={fieldToolLabel(canvas.tool)}
          onChange={(event) =>
            canvas.setTool(event.currentTarget.checked ? 'move' : 'draw')
          }
        />
        <span className={fieldToggle.fieldToggle} aria-hidden='true'>
          <span className={fieldToggle.fieldToggleLeft}>
            <b>Draw</b>
          </span>
          <span className={fieldToggle.fieldToggleRight}>
            <b>Slew</b>
          </span>
        </span>
      </label>
    </div>

    <div className={css.transportKeys}>
      <div className={`${keyBank['radio-input']} ${keyBank.labKeyBank}`}>
        <ActionKey aria-label='Advance one generation' onClick={stepOnce}>
          Step
        </ActionKey>
        <ActionKey aria-label='Clear all live cells' onClick={clearUniverse}>
          Clear
        </ActionKey>
        <ActionKey
          aria-label={
            soundEnabled
              ? 'Turn mechanical audio off'
              : 'Turn mechanical audio on'
          }
          aria-pressed={soundEnabled}
          data-on={soundEnabled ? 'true' : 'false'}
          onClick={toggleSound}
        >
          {soundEnabled ? 'Sfx on' : 'Sfx off'}
        </ActionKey>
      </div>
    </div>
  </section>
)
