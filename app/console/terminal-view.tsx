'use client'

import cn from 'clsx'
import { clamp } from 'es-toolkit'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { playKeyClick } from 'services/audio/key-click'
import { useGameInput } from 'services/hotkeys'
import Shell from 'services/shell'
import { readLocal, writeLocal } from 'services/storage'
import {
  codeOf,
  type Effect,
  HELP,
  type LinkEntry,
  type Output,
  runCommand,
} from './command-shell'
import { EYE_ART, HACKER_SOURCE } from './console-art'
import { complete } from './console-complete'
import { buildIntroOps } from './console-intro'
import { resolvePath } from './console-path'
import {
  type ConsoleOutput,
  type ConsoleResult,
  initialState,
  promptFor,
  reduce,
} from './console-reducer'
import css from './terminal.module.css'
import TreeView from './tree-view'

type Execute = (commands: string[]) => void

const FKEYS = [
  ['F1', 'Help', 'help'],
  ['F3', 'Exit', 'exit'],
  ['F6', 'Clear', 'clear'],
  ['F9', 'Links', 'links'],
] as const

const FKEY_COMMANDS = Object.fromEntries(
  FKEYS.map(([key, , command]) => [key, command]),
)

const ROUTE_COMMANDS = [
  { command: 'papers', label: 'Papers', href: '/papers' },
  { command: 'tapes', label: 'Tapes', href: '/videoclub' },
  { command: 'uses', label: 'Uses', href: '/uses' },
  { command: 'manual', label: 'Manual', href: '/manual' },
  { command: 'snake', label: 'Snake', href: '/snake' },
  { command: 'cube', label: 'Cube', href: '/rubiks' },
] as const

const CONSOLE_COMMANDS = ['tree'] as const

const CONSOLE_HELP: ReadonlyArray<readonly [string, string]> = [
  ...HELP.slice(0, 2),
  ['tree [path]', 'browse a collapsible directory tree'],
  ...HELP.slice(2),
]

const GRANTED_AT = 420
const ANIM_FRAME_MS = 140
const HDD_VOLUME = 0.16
const MUTE_KEY = 'serve-muted'

const isInteractive = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('a, button, input'))

function Listing(props: {
  listing: Extract<Output, { kind: 'listing' }>
  execute: Execute
}) {
  const { path, dirs, files } = props.listing
  const base = path === '/' ? '' : path

  return (
    <div className={css.block}>
      <p className={cn(css.line, css.dim)}>
        Directory of S:{path.toUpperCase()}
      </p>
      <div className={css.grid}>
        {dirs.map((dir) => (
          <button
            key={dir}
            type='button'
            className={css.dirItem}
            onClick={() => props.execute([`cd ${base}/${dir}`, 'ls'])}
          >
            [{dir}]
          </button>
        ))}
        {files.map((file) => (
          <a
            key={file}
            className={css.fileItem}
            href={`${base}/${file}`}
            target='_blank'
            rel='noreferrer'
          >
            {file}
          </a>
        ))}
      </div>
      <p className={cn(css.line, css.dim)}>
        {dirs.length} dir(s) · {files.length} file(s)
      </p>
    </div>
  )
}

function LinksTable(props: { links: LinkEntry[]; execute: Execute }) {
  return (
    <div className={css.block}>
      <div className={cn(css.linkRow, css.dim)} aria-hidden='true'>
        <span>CODE</span>
        <span>TITLE</span>
        <span>DESTINATION</span>
      </div>
      {props.links.map((link) => (
        <div key={link.source} className={css.linkRow}>
          <button
            type='button'
            className={css.dirItem}
            onClick={() => props.execute([`url ${codeOf(link)}`])}
          >
            {codeOf(link)}
          </button>
          <span>{link.title}</span>
          <a
            className={css.fileItem}
            href={link.destination}
            target='_blank'
            rel='noreferrer'
          >
            {link.destination}
          </a>
        </div>
      ))}
      <p className={cn(css.line, css.dim)}>
        OPEN &lt;code&gt; launches · URL &lt;code&gt; copies the short url
      </p>
    </div>
  )
}

function HelpTable() {
  return (
    <div className={css.block}>
      {CONSOLE_HELP.map(([command, description]) => (
        <div key={command} className={css.helpRow}>
          <span className={css.bright}>{command.toUpperCase()}</span>
          <span className={css.dim}>{description}</span>
        </div>
      ))}
      <div className={css.helpRow}>
        <span className={css.bright}>KEYS</span>
        <span className={css.dim}>
          TAB completes · ↑↓ history · F1 help · F3 exit · F6 clear · F9 links
        </span>
      </div>
      <div className={css.helpRow}>
        <span className={css.bright}>ROUTES</span>
        <span className={css.dim}>
          {ROUTE_COMMANDS.map(({ command }) => command.toUpperCase()).join(
            ' · ',
          )}
        </span>
      </div>
    </div>
  )
}

function OutputView(props: {
  output: ConsoleOutput
  paths: string[]
  links: LinkEntry[]
  execute: Execute
}) {
  switch (props.output.kind) {
    case 'text':
      return (
        <p
          className={cn(css.line, props.output.tone && css[props.output.tone])}
        >
          {props.output.text || ' '}
        </p>
      )
    case 'listing':
      return <Listing listing={props.output} execute={props.execute} />
    case 'links':
      return <LinksTable links={props.links} execute={props.execute} />
    case 'help':
      return <HelpTable />
    case 'tree':
      return <TreeView paths={props.paths} segments={props.output.segments} />
  }
}

const runTreeCommand = (
  paths: string[],
  cwd: string[],
  args: string[],
): ConsoleResult => {
  if (args.length > 1 || args.some((arg) => arg.startsWith('-'))) {
    return {
      cwd,
      output: [
        {
          kind: 'text',
          text: 'Usage: TREE [path]',
          tone: 'dim',
        },
      ],
    }
  }

  const arg = args[0]
  const target = arg
    ? resolvePath(paths, cwd, arg)
    : { kind: 'dir' as const, segments: cwd }

  if (!target) {
    return {
      cwd,
      output: [
        {
          kind: 'text',
          text: `Path not found — ${arg}`,
          tone: 'error',
        },
      ],
    }
  }
  if (target.kind === 'file') {
    return {
      cwd,
      output: [
        {
          kind: 'text',
          text: `Not a directory — ${arg}`,
          tone: 'error',
        },
      ],
    }
  }

  return {
    cwd,
    output: [{ kind: 'tree', segments: target.segments }],
  }
}

export default function TerminalView(props: {
  paths: string[]
  links: LinkEntry[]
}) {
  const { paths, links } = props
  const router = useRouter()
  // the terminal owns the keyboard: site hotkeys (b, g h, konami) stand down
  useGameInput()
  const [state, dispatch] = useReducer(reduce, undefined, initialState)
  const [value, setValue] = useState('')
  const [introShown, setIntroShown] = useState(0)
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(false)
  const [introOps] = useState(() => buildIntroOps(paths.length, links.length))
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const hddRef = useRef<HTMLAudioElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const introTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const historyRef = useRef({ list: [] as string[], cursor: 0 })
  const mode = state.mode
  const modeRef = useRef(mode)
  modeRef.current = mode

  const note = (output: ConsoleOutput[]) => dispatch({ type: 'note', output })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      note([{ kind: 'text', text: 'Copied to clipboard', tone: 'dim' }])
    } catch {
      note([
        {
          kind: 'text',
          text: 'Clipboard denied — select the url and copy it',
          tone: 'error',
        },
      ])
    }
  }

  const applyEffect = (effect?: Effect) => {
    if (!effect) return
    switch (effect.kind) {
      case 'open':
        window.open(effect.href, '_blank', 'noopener')
        return
      case 'copy':
        void copyToClipboard(effect.text)
        return
      case 'clear':
        return
      case 'exit':
        router.push('/')
        return
      case 'hacker':
      case 'animate':
        inputRef.current?.blur()
        return
      case 'toggle-audio':
        toggleAudio()
        return
    }
  }

  const execute: Execute = (commands) => {
    let cwd = state.cwd
    for (const raw of commands) {
      const command = raw.trim()
      const [name = '', ...args] = command.split(' ').filter(Boolean)
      const route = ROUTE_COMMANDS.find(
        (item) => item.command === command.toLowerCase(),
      )
      if (route) {
        dispatch({
          type: 'ran',
          prompt: promptFor(cwd),
          command,
          result: {
            cwd,
            output: [
              {
                kind: 'text',
                text: `Routing signal to ${route.label.toUpperCase()}...`,
                tone: 'bright',
              },
            ],
          },
        })
        router.push(route.href)
        return
      }
      if (name.toLowerCase() === 'tree') {
        const result = runTreeCommand(paths, cwd, args)
        dispatch({ type: 'ran', prompt: promptFor(cwd), command, result })
        cwd = result.cwd
        continue
      }
      const result = runCommand({ paths, links, cwd }, command)
      dispatch({ type: 'ran', prompt: promptFor(cwd), command, result })
      applyEffect(result.effect)
      cwd = result.cwd
    }
  }

  const executeRef = useRef(execute)
  executeRef.current = execute

  const runSequence = () => {
    clearTimeout(introTimer.current)
    let shown = 0
    const tick = () => {
      shown += 1
      setIntroShown(shown)
      const hold = introOps[shown - 1].hold
      if (shown < introOps.length) {
        introTimer.current = setTimeout(tick, hold)
        return
      }
      introTimer.current = setTimeout(() => {
        setReady(true)
        executeRef.current(['ls'])
      }, hold)
    }
    introTimer.current = setTimeout(tick, 300)
  }
  const runSequenceRef = useRef(runSequence)
  runSequenceRef.current = runSequence

  const clickKey = () => {
    if (mutedRef.current) return
    audioCtxRef.current ??= new AudioContext()
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    playKeyClick(ctx)
  }

  const startHdd = () => {
    const hdd = hddRef.current
    if (!hdd) return
    hdd.volume = HDD_VOLUME
    hdd.play().catch(() => {})
  }

  const toggleAudio = () => {
    setMuted((current) => {
      const next = !current
      writeLocal(MUTE_KEY, next ? '1' : '0')
      note([
        {
          kind: 'text',
          text: next
            ? 'Audio OFF · boot chime and drive hum muted'
            : 'Audio ON · drive hum resumes',
          tone: 'dim',
        },
      ])
      return next
    })
  }

  const startBoot = () => {
    dispatch({ type: 'boot' })
    audioRef.current?.play().catch(() => {})
    runSequence()
  }
  const startBootRef = useRef(startBoot)
  startBootRef.current = startBoot

  const submit = () => {
    const command = value.trim()
    if (command) {
      historyRef.current.list.push(command)
      historyRef.current.cursor = historyRef.current.list.length
    }
    execute([command])
    setValue('')
  }

  const recall = (event: React.KeyboardEvent, step: number) => {
    event.preventDefault()
    const { list, cursor } = historyRef.current
    if (list.length === 0) return
    const next = clamp(cursor + step, 0, list.length)
    historyRef.current.cursor = next
    setValue(list[next] ?? '')
  }

  const autocomplete = (event: React.KeyboardEvent) => {
    event.preventDefault()
    const completion = complete({ paths, links, cwd: state.cwd }, value, {
      directoryOnlyCommands: CONSOLE_COMMANDS,
      extraCommandNames: CONSOLE_COMMANDS,
    })
    setValue(completion.value)
    if (completion.options.length > 1) {
      note([
        { kind: 'text', text: completion.options.join('   '), tone: 'dim' },
      ])
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    clickKey()
    // Enter can launch hacker/animate; keep it off the window listener so the
    // same keystroke doesn't immediately count as the "any key stops" trigger
    if (event.key === 'Enter') {
      event.stopPropagation()
      return submit()
    }
    // Shift+Tab stays free so keyboard focus can leave the prompt (WCAG 2.1.2)
    if (event.key === 'Tab' && !event.shiftKey) return autocomplete(event)
    if (event.key === 'Escape') return event.currentTarget.blur()
    if (event.key === 'ArrowUp') return recall(event, -1)
    if (event.key === 'ArrowDown') return recall(event, 1)
  }

  const clickKeyRef = useRef(clickKey)
  clickKeyRef.current = clickKey

  useEffect(() => {
    const onHackerKey = (event: KeyboardEvent) => {
      event.preventDefault()
      clickKeyRef.current()
      if (event.key === 'Escape') {
        dispatch({ type: 'hacker-exit' })
        return
      }
      dispatch({ type: 'hacker-type' })
    }
    // Tab and bare modifiers stay free for keyboard navigation and AT chords
    const passThroughKeys = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta'])
    const onWindowKeyDown = (event: KeyboardEvent) => {
      switch (modeRef.current.kind) {
        case 'gated':
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          startBootRef.current()
          return
        case 'anim':
          if (passThroughKeys.has(event.key)) return
          event.preventDefault()
          dispatch({ type: 'anim-stop' })
          return
        case 'hacker':
          onHackerKey(event)
          return
        case 'shell': {
          const command = FKEY_COMMANDS[event.key]
          if (!command) return
          event.preventDefault()
          executeRef.current([command])
        }
      }
    }
    const onWindowClick = (event: MouseEvent) => {
      switch (modeRef.current.kind) {
        case 'gated':
          startBootRef.current()
          return
        case 'anim':
          dispatch({ type: 'anim-stop' })
          return
        case 'hacker':
          dispatch({ type: 'hacker-type' })
          return
        case 'shell':
          if (isInteractive(event.target)) return
          if (window.getSelection()?.toString()) return
          inputRef.current?.focus({ preventScroll: true })
      }
    }
    window.addEventListener('keydown', onWindowKeyDown)
    window.addEventListener('click', onWindowClick)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
      window.removeEventListener('click', onWindowClick)
    }
  }, [])

  useEffect(() => {
    const storedMute = readLocal(MUTE_KEY) === '1'
    mutedRef.current = storedMute
    setMuted(storedMute)
  }, [])

  // autoplay needs a prior user gesture: try, and gate on a keypress when the
  // browser blocks it. Reduced motion skips straight to the shell.
  useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduced) {
      setReady(true)
      executeRef.current(['ls'])
      return
    }
    // a muted element autoplays freely, so muted visitors skip the gate
    if (audioRef.current) audioRef.current.muted = mutedRef.current
    const play = audioRef.current?.play()
    if (!play) {
      runSequenceRef.current()
    } else {
      play
        .then(() => runSequenceRef.current())
        .catch((error: DOMException) => {
          // NotAllowedError = autoplay blocked; anything else = no/bad audio file
          if (error?.name === 'NotAllowedError') dispatch({ type: 'gate' })
          else runSequenceRef.current()
        })
    }
    return () => clearTimeout(introTimer.current)
  }, [])

  const showScroll = mode.kind === 'shell'

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
    if (hddRef.current) hddRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    // claim focus only when it sits nowhere; never steal an active position
    const idle =
      document.activeElement === document.body ||
      document.activeElement === null
    if (ready && showScroll && idle) {
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [ready, showScroll])

  useEffect(() => {
    if (mode.kind !== 'anim') return
    const timer = setInterval(
      () => dispatch({ type: 'anim-tick' }),
      ANIM_FRAME_MS,
    )
    return () => clearInterval(timer)
  }, [mode.kind])

  // biome-ignore lint/correctness/useExhaustiveDependencies: these are the scroll triggers, not values read
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [state.entries, mode, introShown])

  const hackerText =
    mode.kind === 'hacker'
      ? HACKER_SOURCE.repeat(
          Math.floor(mode.typed / HACKER_SOURCE.length) + 1,
        ).slice(0, mode.typed)
      : ''

  const shownOps = introOps.slice(0, introShown)
  const screenStart = shownOps.findLastIndex((op) => op.kind === 'clear') + 1
  const screenOps = shownOps.slice(screenStart)

  return (
    <Shell className={css.page}>
      <h1 className='sr-only'>Console — asset terminal</h1>
      <div className={css.machine}>
        <span
          className={css.bootPilot}
          data-active={!ready || mode.kind === 'gated'}
          aria-hidden='true'
        >
          <i />
          POST / SIGNAL
        </span>
        <div className={css.crt}>
          <div className={css.raster} aria-hidden='true' />
          <div className={css.blend} aria-hidden='true' />

          {/* biome-ignore lint/a11y/useMediaCaption: boot chime and drive hum carry no speech */}
          <audio ref={audioRef} preload='auto' onEnded={startHdd}>
            <source src='/sounds/boot.webm' type='audio/webm' />
            <source src='/sounds/boot.m4a' type='audio/mp4' />
          </audio>
          {/* biome-ignore lint/a11y/useMediaCaption: boot chime and drive hum carry no speech */}
          <audio ref={hddRef} preload='auto' loop>
            <source src='/sounds/hdd.webm' type='audio/webm' />
            <source src='/sounds/hdd.m4a' type='audio/mp4' />
          </audio>

          {mode.kind === 'gated' && (
            <button
              type='button'
              className={css.gate}
              onClick={() => startBoot()}
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
              <p className='sr-only'>
                Playing an ascii animation. Any key stops.
              </p>
              <pre className={css.animArt} aria-hidden='true'>
                {mode.frames[mode.index]}
              </pre>
            </div>
          )}

          {(mode.kind === 'hacker' || showScroll) && (
            <div className={css.scroll} ref={scrollRef}>
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
                          className={cn(css.line, op.tone && css[op.tone])}
                        >
                          {op.text || ' '}
                        </p>
                      ),
                    )}
                  </div>

                  <div role='log' aria-live='polite'>
                    {state.entries.map((entry) => (
                      <div className={css.entry} key={entry.id}>
                        {entry.prompt !== undefined && (
                          <p className={css.line}>
                            <span className={css.promptLabel}>
                              {entry.prompt}{' '}
                            </span>
                            {entry.command}
                          </p>
                        )}
                        {entry.output.map((output, index) => (
                          <OutputView
                            // biome-ignore lint/suspicious/noArrayIndexKey: entries append once and never reorder
                            key={index}
                            output={output}
                            paths={paths}
                            links={links}
                            execute={execute}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  {ready && (
                    <div className={css.promptRow}>
                      <span className={css.promptLabel}>
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
                    <p className={cn(css.line, css.dim)}>
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
        </div>

        <div className={css.keybar}>
          <div className={css.fkeys}>
            {FKEYS.map(([key, label, command]) => (
              <button
                key={key}
                type='button'
                onClick={() => execute([command])}
              >
                <b>{key}</b>={label}
              </button>
            ))}
          </div>
          <div className={css.plates}>
            <span className={css.plate}>
              <i aria-hidden='true' /> System ready
            </span>
            <span className={css.plate}>S: read-only</span>
            <button
              type='button'
              className={cn(css.plate, css.plateButton)}
              aria-pressed={!muted}
              aria-label={muted ? 'Turn audio on' : 'Turn audio off'}
              onClick={() => toggleAudio()}
            >
              ♪ {muted ? 'OFF' : 'ON'}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}
