import cn from 'clsx'
import type React from 'react'
import type { LinkEntry } from './command-shell'
import { EYE_ART, HACKER_SOURCE } from './console-art'
import type { IntroOp } from './console-intro'
import { CommandLog, type Execute } from './console-output'
import consoleOutput from './console-output.module.css'
import { promptFor, type State } from './console-reducer'
import css from './console-screen.module.css'
import type { CommandLine } from './use-command-line'

const GRANTED_AT = 420

export function ConsoleScreen(props: {
  state: State
  ready: boolean
  screenOps: IntroOp[]
  paths: string[]
  links: LinkEntry[]
  execute: Execute
  commandLine: CommandLine
  inputRef: React.RefObject<HTMLInputElement | null>
  scrollRef: React.RefObject<HTMLDivElement | null>
  onBoot: () => void
}) {
  const { state, ready, screenOps, paths, links, execute, inputRef } = props
  const { value, setValue, onKeyDown } = props.commandLine
  const mode = state.mode
  const showScroll = mode.kind === 'shell'

  const hackerText =
    mode.kind === 'hacker'
      ? HACKER_SOURCE.repeat(
          Math.floor(mode.typed / HACKER_SOURCE.length) + 1,
        ).slice(0, mode.typed)
      : ''

  return (
    <>
      {mode.kind === 'gated' && (
        <button
          type='button'
          className={css.gate}
          onClick={() => props.onBoot()}
        >
          <span aria-hidden='true' className={css.gateEye}>
            {EYE_ART}
          </span>
          <span className={css.gatePrompt}>▸ PRESS ENTER TO BOOT</span>
          <span className={css.gateHint}>sound on</span>
        </button>
      )}

      {mode.kind === 'anim' && (
        <div className={css.animStage}>
          <p className='sr-only'>Playing an ascii animation. Any key stops.</p>
          <pre className={css.animArt} aria-hidden='true'>
            {mode.frames[mode.index]}
          </pre>
        </div>
      )}

      {(mode.kind === 'hacker' || showScroll) && (
        <div className={css.scroll} ref={props.scrollRef}>
          {mode.kind === 'hacker' && (
            <>
              <p className='sr-only'>
                Hacker mode. Any key types code, Escape exits.
              </p>
              <pre className={css.hackerFeed} aria-hidden='true'>
                {hackerText}
                <span className={css.cursor}>█</span>
              </pre>
            </>
          )}

          {showScroll && (
            <>
              <div className={css.intro} aria-hidden='true'>
                {screenOps.map((op, index) =>
                  op.kind === 'eye' ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: intro is a fixed ordered script
                    <p className={css.eyeLine} key={index}>
                      {op.text}
                    </p>
                  ) : (
                    <p
                      // biome-ignore lint/suspicious/noArrayIndexKey: intro is a fixed ordered script
                      key={index}
                      className={cn(
                        consoleOutput.line,
                        op.tone && consoleOutput[op.tone],
                      )}
                    >
                      {op.text || ' '}
                    </p>
                  ),
                )}
              </div>

              <CommandLog
                entries={state.entries}
                paths={paths}
                links={links}
                execute={execute}
              />

              {ready && (
                <div className={css.promptRow}>
                  <span className={consoleOutput.promptLabel}>
                    {promptFor(state.cwd)}{' '}
                  </span>
                  <span className={css.echo} aria-hidden='true'>
                    {value}
                  </span>
                  <span className={css.cursor} aria-hidden='true'>
                    █
                  </span>
                  <input
                    ref={inputRef}
                    className={css.input}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={onKeyDown}
                    aria-label='Terminal input. Type help for commands'
                    aria-describedby='console-input-hint'
                    autoCapitalize='none'
                    autoComplete='off'
                    autoCorrect='off'
                    spellCheck={false}
                    enterKeyHint='go'
                  />
                  <span className='sr-only' id='console-input-hint'>
                    Tab autocompletes. Shift plus Tab or Escape leaves the
                    prompt.
                  </span>
                </div>
              )}

              <noscript>
                <p className={cn(consoleOutput.line, consoleOutput.dim)}>
                  This console needs JavaScript — the assets stay served at
                  their urls.
                </p>
              </noscript>
            </>
          )}
        </div>
      )}
      {mode.kind === 'hacker' && mode.typed >= GRANTED_AT && (
        <p className={css.granted} aria-hidden='true'>
          ACCESS GRANTED
        </p>
      )}
    </>
  )
}
