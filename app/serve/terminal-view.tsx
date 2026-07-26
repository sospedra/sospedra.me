'use client'

import cn from 'clsx'
import Shell from 'components/Shell'
import { clamp } from 'es-toolkit'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useGameInput } from 'service/hotkeys'
import {
  codeOf,
  complete,
  type Effect,
  EYE_ART,
  HACKER_SOURCE,
  HELP,
  joinPath,
  type LinkEntry,
  type Output,
  runCommand,
  type ShellResult,
  type Tone,
} from './shell'
import css from './terminal.module.css'

type Entry = { id: number; prompt?: string; command?: string; output: Output[] }
type State = { seq: number; cwd: string[]; entries: Entry[] }
type Event =
  | { type: 'ran'; prompt: string; command: string; result: ShellResult }
  | { type: 'note'; output: Output[] }
  | { type: 'clear' }

type Execute = (commands: string[]) => void

const promptFor = (cwd: string[]) => `S:${joinPath(cwd).toUpperCase()}>`

const append = (state: State, entry: Omit<Entry, 'id'>): State => ({
  ...state,
  seq: state.seq + 1,
  entries: [...state.entries, { ...entry, id: state.seq }],
})

const reduce = (state: State, event: Event): State => {
  switch (event.type) {
    case 'ran':
      return {
        ...append(state, {
          prompt: event.prompt,
          command: event.command,
          output: event.result.output,
        }),
        cwd: event.result.cwd,
      }
    case 'note':
      return append(state, { output: event.output })
    case 'clear':
      return { ...state, entries: [] }
  }
}

// an intro op prints a line (eye/text) or clears to the next screen; `hold`
// is the pause after it. The three screens sum to roughly 12 seconds.
type Op = {
  kind: 'eye' | 'text' | 'clear'
  text?: string
  tone?: Tone
  hold: number
}

const EYE_LINES = EYE_ART.split('\n')

// award-bios style ascii table, fixed width so columns align in any font.
// inner width TW = left col (29) + right col (25) + 2 padding spaces
const TW = 56
const rule = () => `+${'-'.repeat(TW)}+`
const barTitle = (title: string) => {
  const label = `[ ${title} ]`
  const pad = TW - label.length
  const left = Math.floor(pad / 2)
  return `+${'='.repeat(left)}${label}${'='.repeat(pad - left)}+`
}
const trow = (left: string, right: string) =>
  `| ${left.padEnd(29)}${right.padEnd(25)} |`

const buildIntroOps = (assetCount: number, linkCount: number): Op[] => [
  // screen 1 — the eye opens
  ...EYE_LINES.map((text): Op => ({ kind: 'eye', text, hold: 70 })),
  { kind: 'text', text: '', hold: 140 },
  {
    kind: 'text',
    text: 'S O S P E D R A   I N D U S T R I E S',
    tone: 'bright',
    hold: 480,
  },
  {
    kind: 'text',
    text: 'phosphor systems division · est 2013',
    tone: 'dim',
    hold: 1900,
  },
  { kind: 'clear', hold: 550 },
  // screen 2 — post and the system configuration table
  { kind: 'text', text: 'PHOSPHOR BIOS v5.150', tone: 'bright', hold: 340 },
  {
    kind: 'text',
    text: 'Detecting processor ......... Pentium(R) OverDrive 66',
    hold: 440,
  },
  { kind: 'text', text: 'Detecting coprocessor ....... Present', hold: 340 },
  { kind: 'text', text: 'Memory test ................. 640K OK', hold: 460 },
  { kind: 'text', text: '', hold: 180 },
  {
    kind: 'text',
    text: barTitle('SYSTEM CONFIGURATION'),
    tone: 'dim',
    hold: 150,
  },
  {
    kind: 'text',
    text: trow('Main Processor : Pentium 66', 'Base Memory  : 640K'),
    hold: 130,
  },
  {
    kind: 'text',
    text: trow('Numeric Copro. : Present', 'Ext. Memory  : 15M'),
    hold: 130,
  },
  {
    kind: 'text',
    text: trow('Floppy Drive A : 1.44M 3.5"', 'Cache Memory : 256K'),
    hold: 130,
  },
  {
    kind: 'text',
    text: trow('Display Type   : EGA / VGA', 'Serial Port  : 03F8'),
    hold: 130,
  },
  {
    kind: 'text',
    text: trow(
      `Drive S:       : R/O ${assetCount}`,
      `Link Registry: ${linkCount}`,
    ),
    hold: 130,
  },
  { kind: 'text', text: rule(), tone: 'dim', hold: 1500 },
  { kind: 'clear', hold: 550 },
  // screen 3 — the os takes over
  { kind: 'text', text: 'Starting S-DOS...', tone: 'bright', hold: 620 },
  { kind: 'text', text: 'Loading PHOSPHOR.SYS ........ OK', hold: 340 },
  { kind: 'text', text: 'Loading S-DOS kernel ........ OK', hold: 340 },
  {
    kind: 'text',
    text: `Mounting S:/ ................ ${assetCount} files`,
    hold: 340,
  },
  { kind: 'text', text: 'Starting command shell ...... OK', hold: 560 },
  { kind: 'text', text: '', hold: 150 },
  {
    kind: 'text',
    text: 'SOSPEDRA IND. PERSONAL SYSTEM /S',
    tone: 'bright',
    hold: 240,
  },
  {
    kind: 'text',
    text: 'TAB completes · type HELP for the index',
    tone: 'dim',
    hold: 500,
  },
]

const initialState = (): State => ({ seq: 0, cwd: [], entries: [] })

const FKEYS = [
  ['F1', 'Help', 'help'],
  ['F3', 'Exit', 'exit'],
  ['F6', 'Clear', 'clear'],
  ['F9', 'Links', 'links'],
] as const

const FKEY_COMMANDS = Object.fromEntries(
  FKEYS.map(([key, , command]) => [key, command]),
)

// hackertyper pacing: chars of kernel per keypress, banner threshold
const HACKER_CHUNK = 3
const GRANTED_AT = 420
const ANIM_FRAME_MS = 140
const HDD_VOLUME = 0.16
const MUTE_KEY = 'serve-muted'

// a soft mechanical key-click, synthesized so fast typing never stutters
const playClick = (ctx: AudioContext) => {
  const dur = 0.02
  const buffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * dur),
    ctx.sampleRate,
  )
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 1800 + Math.random() * 900
  band.Q.value = 0.7
  const gain = ctx.createGain()
  gain.gain.value = 0.12
  source.connect(band).connect(gain).connect(ctx.destination)
  source.start()
}

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
      {HELP.map(([command, description]) => (
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
    </div>
  )
}

function OutputView(props: {
  output: Output
  links: LinkEntry[]
  execute: Execute
}) {
  switch (props.output.kind) {
    case 'text':
      return (
        <p
          className={cn(css.line, props.output.tone && css[props.output.tone])}
        >
          {props.output.text || ' '}
        </p>
      )
    case 'listing':
      return <Listing listing={props.output} execute={props.execute} />
    case 'links':
      return <LinksTable links={props.links} execute={props.execute} />
    case 'help':
      return <HelpTable />
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
  const [intro, setIntro] = useState(0)
  const [ready, setReady] = useState(false)
  // true when autoplay was blocked: we wait for a keypress to boot with sound
  const [gated, setGated] = useState(false)
  const [muted, setMuted] = useState(
    () =>
      typeof window !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1',
  )
  // null = shell mode, a number = hackertyper mode at that many chars typed
  const [hackerPos, setHackerPos] = useState<number | null>(null)
  const [anim, setAnim] = useState<{ frames: string[]; index: number } | null>(
    null,
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const hddRef = useRef<HTMLAudioElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const seqTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const historyRef = useRef({ list: [] as string[], cursor: 0 })
  const hacking = hackerPos !== null
  const animating = anim !== null
  const hackingRef = useRef(false)
  hackingRef.current = hacking
  const animatingRef = useRef(false)
  animatingRef.current = animating

  const INTRO_OPS = buildIntroOps(paths.length, links.length)

  const note = (output: Output[]) => dispatch({ type: 'note', output })

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
    if (effect.kind === 'open') window.open(effect.href, '_blank', 'noopener')
    if (effect.kind === 'copy') void copyToClipboard(effect.text)
    if (effect.kind === 'clear') dispatch({ type: 'clear' })
    if (effect.kind === 'exit') router.push('/')
    if (effect.kind === 'hacker') {
      setHackerPos(0)
      inputRef.current?.blur()
    }
    if (effect.kind === 'animate') {
      setAnim({ frames: effect.frames, index: 0 })
      inputRef.current?.blur()
    }
    if (effect.kind === 'toggle-audio') toggleAudio()
  }

  const execute: Execute = (commands) => {
    let cwd = state.cwd
    for (const raw of commands) {
      const command = raw.trim()
      const result = runCommand({ paths, links, cwd }, command)
      dispatch({ type: 'ran', prompt: promptFor(cwd), command, result })
      applyEffect(result.effect)
      cwd = result.cwd
    }
  }

  const executeRef = useRef(execute)
  executeRef.current = execute

  // walk the intro ops on a timer chain, then hand off to the shell with ls
  const runSequence = () => {
    clearTimeout(seqTimer.current)
    let shown = 0
    const tick = () => {
      shown += 1
      setIntro(shown)
      const hold = INTRO_OPS[shown - 1].hold
      if (shown < INTRO_OPS.length) {
        seqTimer.current = setTimeout(tick, hold)
        return
      }
      seqTimer.current = setTimeout(() => {
        setReady(true)
        executeRef.current(['ls'])
      }, hold)
    }
    seqTimer.current = setTimeout(tick, 300)
  }
  const runSequenceRef = useRef(runSequence)
  runSequenceRef.current = runSequence

  const clickKey = () => {
    if (mutedRef.current) return
    audioCtxRef.current ??= new AudioContext()
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') void ctx.resume()
    playClick(ctx)
  }

  // the boot chime ends, the drive hum takes over and loops
  const startHdd = () => {
    const hdd = hddRef.current
    if (!hdd) return
    hdd.volume = HDD_VOLUME
    hdd.play().catch(() => {})
  }

  const toggleAudio = () => {
    setMuted((current) => {
      const next = !current
      localStorage.setItem(MUTE_KEY, next ? '1' : '0')
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
    setGated(false)
    audioRef.current?.play().catch(() => {})
    runSequence()
  }
  const startBootRef = useRef(startBoot)
  startBootRef.current = startBoot
  const gatedRef = useRef(false)
  gatedRef.current = gated

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
    const completion = complete({ paths, links, cwd: state.cwd }, value)
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
    if (event.key === 'Tab') return autocomplete(event)
    if (event.key === 'ArrowUp') return recall(event, -1)
    if (event.key === 'ArrowDown') return recall(event, 1)
  }

  const noteRef = useRef(note)
  noteRef.current = note
  const clickKeyRef = useRef(clickKey)
  clickKeyRef.current = clickKey

  // fkeys fire globally, clicks on dead glass refocus the prompt;
  // in hacker mode every key feeds the feed and escape bails
  useEffect(() => {
    const onHackerKey = (event: KeyboardEvent) => {
      event.preventDefault()
      clickKeyRef.current()
      if (event.key === 'Escape') {
        setHackerPos(null)
        noteRef.current([
          {
            kind: 'text',
            text: 'ACCESS GRANTED · trace wiped · welcome back to S-DOS',
            tone: 'bright',
          },
        ])
        inputRef.current?.focus({ preventScroll: true })
        return
      }
      setHackerPos((pos) => (pos ?? 0) + HACKER_CHUNK)
    }
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (gatedRef.current) {
        event.preventDefault()
        startBootRef.current()
        return
      }
      if (animatingRef.current) {
        event.preventDefault()
        setAnim(null)
        inputRef.current?.focus({ preventScroll: true })
        return
      }
      if (hackingRef.current) return onHackerKey(event)
      const command = FKEY_COMMANDS[event.key]
      if (!command) return
      event.preventDefault()
      executeRef.current([command])
    }
    const onWindowClick = (event: MouseEvent) => {
      if (gatedRef.current) {
        startBootRef.current()
        return
      }
      if (animatingRef.current) {
        setAnim(null)
        inputRef.current?.focus({ preventScroll: true })
        return
      }
      if (hackingRef.current) {
        setHackerPos((pos) => (pos ?? 0) + HACKER_CHUNK)
        return
      }
      if (isInteractive(event.target)) return
      if (window.getSelection()?.toString()) return
      inputRef.current?.focus({ preventScroll: true })
    }
    window.addEventListener('keydown', onWindowKeyDown)
    window.addEventListener('click', onWindowClick)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
      window.removeEventListener('click', onWindowClick)
    }
  }, [])

  // boot on load with sound. reduced motion skips straight to the shell.
  // audio needs a user gesture: after an in-app click autoplay is allowed, so
  // we try it; if the browser blocks it we gate on a keypress instead.
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
        .catch((err: DOMException) => {
          // NotAllowedError = autoplay blocked; anything else = no/bad audio file
          if (err?.name === 'NotAllowedError') setGated(true)
          else runSequenceRef.current()
        })
    }
    return () => clearTimeout(seqTimer.current)
  }, [])

  const showScroll = !hacking && !animating && !gated

  // the audio elements keep playing; muting just silences them instantly
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
    if (hddRef.current) hddRef.current.muted = muted
  }, [muted])

  // refocus when the prompt (re)mounts: after boot, or leaving hacker/animate
  useEffect(() => {
    if (ready && showScroll) inputRef.current?.focus({ preventScroll: true })
  }, [ready, showScroll])

  // cycle animation frames until a key or click stops it
  useEffect(() => {
    if (!animating) return
    const timer = setInterval(() => {
      setAnim((current) =>
        current
          ? { ...current, index: (current.index + 1) % current.frames.length }
          : current,
      )
    }, ANIM_FRAME_MS)
    return () => clearInterval(timer)
  }, [animating])

  // biome-ignore lint/correctness/useExhaustiveDependencies: these are the scroll triggers, not values read
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [state.entries, hackerPos, intro])

  const hackerText = hacking
    ? HACKER_SOURCE.repeat(
        Math.floor(hackerPos / HACKER_SOURCE.length) + 1,
      ).slice(0, hackerPos)
    : ''

  // only the current screen is on the tube: start after the last clear shown
  const screenStart = INTRO_OPS.slice(0, intro).reduce(
    (start, op, index) => (op.kind === 'clear' ? index + 1 : start),
    0,
  )
  const screenOps = INTRO_OPS.slice(screenStart, intro)

  return (
    <Shell canonical='/serve' className={css.page}>
      <h1 className='sr-only'>Serve — asset terminal</h1>
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

        {gated && (
          <button
            type='button'
            className={css.gate}
            onClick={() => startBoot()}
          >
            <span className={css.gateEye}>{EYE_ART}</span>
            <span className={css.gatePrompt}>▸ PRESS ENTER TO BOOT</span>
            <span className={css.gateHint}>sound on</span>
          </button>
        )}

        {animating && (
          <div className={css.animStage}>
            <p className='sr-only'>
              Playing an ascii animation. Any key stops.
            </p>
            <pre className={css.animArt} aria-hidden='true'>
              {anim?.frames[anim.index]}
            </pre>
          </div>
        )}

        {hacking && (
          <div className={css.scroll} ref={scrollRef}>
            <p className='sr-only'>
              Hacker mode. Any key types code, Escape exits.
            </p>
            <pre className={css.hackerFeed} aria-hidden='true'>
              {hackerText}
              <span className={css.cursor}>█</span>
            </pre>
          </div>
        )}
        {hacking && hackerPos >= GRANTED_AT && (
          <p className={css.granted} aria-hidden='true'>
            ACCESS GRANTED
          </p>
        )}

        {showScroll && (
          <div className={css.scroll} ref={scrollRef}>
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
                      <span className={css.promptLabel}>{entry.prompt} </span>
                      {entry.command}
                    </p>
                  )}
                  {entry.output.map((output, index) => (
                    <OutputView
                      // biome-ignore lint/suspicious/noArrayIndexKey: entries append once and never reorder
                      key={index}
                      output={output}
                      links={links}
                      execute={execute}
                    />
                  ))}
                </div>
              ))}
            </div>

            {ready && (
              <div className={css.promptRow}>
                <span className={css.promptLabel}>{promptFor(state.cwd)} </span>
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
                  autoCapitalize='none'
                  autoComplete='off'
                  autoCorrect='off'
                  spellCheck={false}
                  enterKeyHint='go'
                />
              </div>
            )}

            <noscript>
              <p className={cn(css.line, css.dim)}>
                This console needs JavaScript — the assets stay served at their
                urls.
              </p>
            </noscript>
          </div>
        )}

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
