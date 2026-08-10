'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useReducer, useRef, useState } from 'react'
import { playKeyClick } from 'services/audio/key-click'
import { useGameInput } from 'services/hotkeys'
import Shell from 'services/shell'
import { readLocal, writeLocal } from 'services/storage'
import { prefersQuietFx } from 'services/theme'
import { match, P } from 'ts-pattern'
import { type Effect, type LinkEntry, runCommand } from './command-shell'
import { runTreeCommand } from './console-commands'
import { buildIntroOps } from './console-intro'
import { ConsoleKeybar, FKEY_COMMANDS } from './console-keybar'
import type { Execute } from './console-output'
import {
  type ConsoleOutput,
  initialState,
  promptFor,
  reduce,
} from './console-reducer'
import { ConsoleScreen } from './console-screen'
import css from './terminal.module.css'
import { useCommandLine } from './use-command-line'

const ANIM_FRAME_MS = 140
const HDD_VOLUME = 0.16
const MUTE_KEY = 'serve-muted'
/* iOS defers media loading (Low Power, cellular) and can leave play()
   unsettled forever; past this, an unsettled play counts as blocked */
const PLAY_SETTLE_MS = 1500

const isInteractive = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('a, button, input'))

export default function TerminalView(props: {
  paths: string[]
  links: LinkEntry[]
}) {
  const { paths, links } = props
  const router = useRouter()
  // the terminal owns the keyboard: site hotkeys (b, g h, konami) stand down
  useGameInput()
  const [state, dispatch] = useReducer(reduce, undefined, initialState)
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
    match(effect)
      .with({ kind: 'open' }, ({ href }) =>
        window.open(href, '_blank', 'noopener'),
      )
      .with({ kind: 'copy' }, ({ text }) => void copyToClipboard(text))
      .with({ kind: 'clear' }, () => {})
      .with({ kind: 'exit' }, () => router.push('/'))
      .with({ kind: 'navigate' }, ({ href }) => router.push(href))
      .with({ kind: P.union('hacker', 'animate') }, () =>
        inputRef.current?.blur(),
      )
      .with({ kind: 'toggle-audio' }, () => toggleAudio())
      .exhaustive()
  }

  const execute: Execute = (commands) => {
    let cwd = state.cwd
    for (const raw of commands) {
      const command = raw.trim()
      const [name = '', ...args] = command.split(' ').filter(Boolean)
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

  const commandLine = useCommandLine({
    context: { paths, links, cwd: state.cwd },
    execute,
    note,
    clickKey,
  })

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
      match(modeRef.current.kind)
        .with('gated', () => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          startBootRef.current()
        })
        .with('anim', () => {
          if (passThroughKeys.has(event.key)) return
          event.preventDefault()
          dispatch({ type: 'anim-stop' })
        })
        .with('hacker', () => onHackerKey(event))
        .with('shell', () => {
          const command = FKEY_COMMANDS[event.key]
          if (!command) return
          event.preventDefault()
          executeRef.current([command])
        })
        .exhaustive()
    }
    // iOS only synthesizes window clicks from taps on clickable targets, so
    // the modal modes act on pointerup and swallow the click twin if it comes
    let tapActed = false
    const onWindowPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      tapActed = false
      match(modeRef.current.kind)
        .with('gated', () => {
          tapActed = true
          startBootRef.current()
        })
        .with('anim', () => {
          tapActed = true
          dispatch({ type: 'anim-stop' })
        })
        .with('hacker', () => {
          tapActed = true
          dispatch({ type: 'hacker-type' })
        })
        .with('shell', () => {})
        .exhaustive()
    }
    const onWindowClick = (event: MouseEvent) => {
      if (tapActed) {
        tapActed = false
        return
      }
      match(modeRef.current.kind)
        .with('gated', () => startBootRef.current())
        .with('anim', () => dispatch({ type: 'anim-stop' }))
        .with('hacker', () => dispatch({ type: 'hacker-type' }))
        .with('shell', () => {
          if (isInteractive(event.target)) return
          if (window.getSelection()?.toString()) return
          inputRef.current?.focus({ preventScroll: true })
        })
        .exhaustive()
    }
    window.addEventListener('keydown', onWindowKeyDown)
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('click', onWindowClick)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('click', onWindowClick)
    }
  }, [])

  useEffect(() => {
    const storedMute = readLocal(MUTE_KEY) === '1'
    mutedRef.current = storedMute
    setMuted(storedMute)
  }, [])

  // autoplay needs a prior user gesture: try, and gate on a keypress when the
  // browser blocks it. Quiet fx skips straight to the shell.
  useEffect(() => {
    if (prefersQuietFx()) {
      setReady(true)
      executeRef.current(['ls'])
      return () => clearTimeout(introTimer.current)
    }
    // a muted element autoplays freely, so muted visitors skip the gate
    if (audioRef.current) audioRef.current.muted = mutedRef.current
    const play = audioRef.current?.play()
    if (!play) {
      runSequenceRef.current()
      return () => clearTimeout(introTimer.current)
    }
    let done = false
    const finish = (outcome: 'run' | 'gate') => {
      if (done) return
      done = true
      clearTimeout(watchdog)
      if (outcome === 'gate') dispatch({ type: 'gate' })
      else runSequenceRef.current()
    }
    const watchdog = setTimeout(() => finish('gate'), PLAY_SETTLE_MS)
    play.then(
      () => finish('run'),
      // NotAllowedError = autoplay blocked; anything else = no/bad audio file
      (error: DOMException) =>
        finish(error?.name === 'NotAllowedError' ? 'gate' : 'run'),
    )
    return () => {
      clearTimeout(watchdog)
      clearTimeout(introTimer.current)
    }
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

          <ConsoleScreen
            state={state}
            ready={ready}
            screenOps={screenOps}
            paths={paths}
            links={links}
            execute={execute}
            commandLine={commandLine}
            inputRef={inputRef}
            scrollRef={scrollRef}
            onBoot={startBoot}
          />
        </div>

        <ConsoleKeybar
          execute={execute}
          muted={muted}
          toggleAudio={toggleAudio}
        />
      </div>
    </Shell>
  )
}
